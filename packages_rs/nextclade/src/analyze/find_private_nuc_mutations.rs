use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::{NucDel, NucDelMinimal};
use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
use crate::analyze::virus_properties::{LabelMap, MutationLabelMaps, NucLabelMap, VirusProperties};
use crate::gene::genotype::{Genotype, GenotypeLabeled};
use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::tree::tree::AuspiceTreeNode;
use crate::utils::collections::concat_to_vec;
use crate::utils::range::Range;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PrivateNucMutations {
  /// All private substitution mutations
  pub private_substitutions: Vec<NucSub>,

  /// All private deletion mutations
  pub private_deletions: Vec<NucDelMinimal>,

  /// A subset of `private_substitutions` which are reversions
  pub reversion_substitutions: Vec<NucSub>,

  /// A subset of `private_substitutions` which has a label assigned
  pub labeled_substitutions: Vec<NucSubLabeled>,

  /// A subset of `private_substitutions` which has no label
  pub unlabeled_substitutions: Vec<NucSub>,

  pub total_private_substitutions: usize,
  pub total_private_deletions: usize,
  pub total_reversion_substitutions: usize,
  pub total_labeled_substitutions: usize,
  pub total_unlabeled_substitutions: usize,
}

/// Finds private mutations.
///
/// Private mutations are the mutations in the query (user-provided) sequence relative to the parent node on the
/// reference tree.
///
/// We have an array of sequence mutations relative to reference and a map of node mutations relative to reference.
/// We want to find private mutations. The following cases are possible:
///
/// |   |                         Case                                 | Private | Mutation from | Mutation to  |
/// |---|--------------------------------------------------------------|---------|---------------|--------------|
/// | 1 | mutation in sequence and in node, same query character       |   no    |      N/A      |     N/A      |
/// | 2 | mutation in sequence and in node, but not the same character |   yes   |    node.qry   |   seq.qry    |
/// | 3 | mutation in sequence but not in node                         |   yes   |    seq.ref    |   seq.qry    |
/// | 4 | mutation in node, but not in sequence, aka "reversion"       |   yes   |    node.qry   |   node.ref   |
/// |   | (mutation in sequence that reverts the character to ref seq) |         |               |              |
/// | 5 | unknown in sequence, mutation in node                        |   no    |      N/A      |     N/A      |
/// | 6 | unknown in sequence, no mutation in node                     |   no    |      N/A      |     N/A      |
///
/// At this point sequence have not yet become a new node on the tree, but is described by the results of the previous
/// analysis steps.
pub fn find_private_nuc_mutations(
  node: &AuspiceTreeNode,
  substitutions: &[NucSub],
  deletions: &[NucDel],
  missing: &[NucRange],
  alignment_range: &Range,
  ref_seq: &[Nuc],
  virus_properties: &VirusProperties,
) -> PrivateNucMutations {
  let node_mut_map = &node.tmp.mutations;

  // Remember which positions we cover while iterating sequence mutations,
  // to be able to skip them when we iterate over node mutations
  let mut seq_positions_mutated_or_deleted = BTreeSet::<usize>::new();

  // Iterate over sequence substitutions
  let non_reversion_substitutions =
    process_seq_substitutions(node_mut_map, substitutions, &mut seq_positions_mutated_or_deleted);

  // Iterate over sequence deletions
  let non_reversion_deletions =
    process_seq_deletions(node_mut_map, deletions, ref_seq, &mut seq_positions_mutated_or_deleted);

  // Iterate over node substitutions and deletions and find reversions
  let reversion_substitutions = find_reversions(
    node_mut_map,
    missing,
    alignment_range,
    ref_seq,
    &mut seq_positions_mutated_or_deleted,
  );

  let (labeled_substitutions, unlabeled_substitutions) = label_private_mutations(
    &non_reversion_substitutions,
    &virus_properties.nuc_mut_label_maps.substitution_label_map,
  );

  let mut private_substitutions = concat_to_vec(&reversion_substitutions, &non_reversion_substitutions);

  private_substitutions.sort();
  private_substitutions.dedup();

  let mut private_deletions = non_reversion_deletions;
  private_deletions.sort();
  private_deletions.dedup();

  let total_private_substitutions = private_substitutions.len();
  let total_private_deletions = private_deletions.len();
  let total_reversion_substitutions = reversion_substitutions.len();
  let total_labeled_substitutions = labeled_substitutions.len();
  let total_unlabeled_substitutions = unlabeled_substitutions.len();

  PrivateNucMutations {
    private_substitutions,
    private_deletions,
    reversion_substitutions,
    labeled_substitutions,
    unlabeled_substitutions,
    total_private_substitutions,
    total_private_deletions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
  }
}

/// Iterates over sequence substitutions, compares sequence and node substitutions and finds the private ones.
///
/// This function is generic and is suitable for both nucleotide and aminoacid substitutions.
fn process_seq_substitutions(
  node_mut_map: &BTreeMap<usize, Nuc>,
  substitutions: &[NucSub],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<NucSub> {
  let mut non_reversion_substitutions = Vec::<NucSub>::new();

  for seq_mut in substitutions {
    let pos = seq_mut.pos;
    seq_positions_mutated_or_deleted.insert(pos);

    if seq_mut.qry.is_unknown() {
      // Cases 5/6: Unknown in sequence
      // Action: Skip nucleotide N and aminoacid X in sequence.
      //         We don't know whether they match the node character or not,
      //         so we decide to not take them into account.
      continue;
    }

    match node_mut_map.get(&pos) {
      None => {
        // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
        // Action: Add the sequence mutation itself.
        non_reversion_substitutions.push(NucSub {
          reff: seq_mut.reff,
          pos,
          qry: seq_mut.qry,
        });
      }
      Some(node_qry) => {
        if &seq_mut.qry != node_qry {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          non_reversion_substitutions.push(NucSub {
            reff: *node_qry,
            pos,
            qry: seq_mut.qry,
          });
        }
      }
    }

    // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
    // nothing to do.
  }

  non_reversion_substitutions.sort();
  non_reversion_substitutions.dedup();

  non_reversion_substitutions
}

/// Iterates over sequence deletions, compares sequence and node deletion and finds the private ones.
///
/// This is a generic declaration, but the implementation for nucleotide and aminoacid deletions is different and the
/// two specializations are provided below. This is due to deletions having different data structure for nucleotides
/// and for amino acids (range vs point).
fn process_seq_deletions(
  node_mut_map: &BTreeMap<usize, Nuc>,
  deletions: &[NucDel],
  ref_seq: &[Nuc],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<NucDelMinimal> {
  let mut non_reversion_deletions = Vec::<NucDelMinimal>::new();

  for del in deletions {
    let start = del.start;
    let end = del.end();

    #[allow(clippy::needless_range_loop)]
    for pos in start..end {
      seq_positions_mutated_or_deleted.insert(pos);

      match node_mut_map.get(&pos) {
        None => {
          // Case 3: Deletion in sequence but not in node, i.e. this is a newly occurred deletion.
          // Action: Add the sequence deletion itself (take refNuc from reference sequence).
          non_reversion_deletions.push(NucDelMinimal {
            reff: ref_seq[pos],
            pos,
          });
        }
        Some(node_qry) => {
          if !node_qry.is_gap() {
            {
              // Case 2: Mutation in node but deletion in sequence (mutation to '-'), i.e. the query character is not the
              // same. Action: Add deletion of node query character.
              non_reversion_deletions.push(NucDelMinimal { reff: *node_qry, pos });
            }
          }
        }
      }

      // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
      // nothing to do.
    }
  }

  non_reversion_deletions.sort();
  non_reversion_deletions.dedup();

  non_reversion_deletions
}

/// Iterates over node mutations, compares node and sequence mutations and finds reversion mutations.
fn find_reversions(
  node_mut_map: &BTreeMap<usize, Nuc>,
  missing: &[NucRange],
  alignment_range: &Range,
  ref_seq: &[Nuc],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<NucSub> {
  let mut reversion_substitutions = Vec::<NucSub>::new();

  for (pos, node_qry) in node_mut_map {
    let pos = *pos;
    let seq_has_no_mut_or_del_here = !seq_positions_mutated_or_deleted.contains(&pos);
    let pos_is_sequenced = is_nuc_sequenced(pos, missing, alignment_range);
    let is_not_node_deletion = !node_qry.is_gap();
    if seq_has_no_mut_or_del_here && pos_is_sequenced && is_not_node_deletion {
      // Case 4: Mutation in node, but not in sequence. This is a so-called reversion. Mutation in sequence reverts
      // the character to ref seq.
      // Action: Add mutation from node query character to character in reference sequence.
      reversion_substitutions.push(NucSub {
        reff: *node_qry,
        pos,
        qry: ref_seq[pos],
      });
    }
  }

  reversion_substitutions.sort();
  reversion_substitutions.dedup();

  reversion_substitutions
}

/// Subdivides private mutations into labeled and unlabeled, according to label map.
fn label_private_mutations(
  non_reversion_substitutions: &[NucSub],
  substitution_label_map: &NucLabelMap,
) -> (Vec<NucSubLabeled>, Vec<NucSub>) {
  let mut labeled_substitutions = Vec::<NucSubLabeled>::new();
  let mut unlabeled_substitutions = Vec::<NucSub>::new();

  for substitution in non_reversion_substitutions {
    // If there's a match in the label map, add mutation to the labelled list, and attach the corresponding labels.
    // If not, add it to the unlabelled list.
    match substitution_label_map.get(&substitution.genotype()) {
      Some(labels) => labeled_substitutions.push(NucSubLabeled {
        sub: substitution.clone(),
        labels: labels.clone(),
      }),
      None => {
        unlabeled_substitutions.push(substitution.clone());
      }
    }
  }

  labeled_substitutions.sort();
  unlabeled_substitutions.dedup();

  (labeled_substitutions, unlabeled_substitutions)
}
