use crate::align::align::AlignPairwiseParams;
use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::virus_properties::VirusProperties;
use crate::cli::nextalign_loop::NextalignOutputs;
use crate::cli::nextclade_loop::{nextclade_run_one, NextcladeOutputs};
use crate::gene::gene_map::GeneMap;
use crate::io::fasta::read_one_fasta_str;
use crate::io::gff3::read_gff3_str;
use crate::io::json::json_stringify;
use crate::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use crate::qc::qc_config::QcConfig;
use crate::translate::translate_genes::TranslationMap;
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{AuspiceTree, CladeNodeAttrKeyDesc};
use crate::tree::tree_attach_new_nodes::tree_attach_new_nodes_in_place;
use crate::tree::tree_preprocess::tree_preprocess_in_place;
use crate::wasm::js_value::{deserialize_js_value, serialize_js_value};
use eyre::{Report, WrapErr};
use log::debug;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::str::FromStr;
use typescript_definitions::TypescriptDefinition;
use wasm_bindgen::prelude::{wasm_bindgen, JsError};

// Plain old Javascript Objects (POJO) to ensure type safety in `JsValue` serialization.
// They are convenient to use in constructors of complex types.
#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "NextcladeParamsPojo")]
  pub type NextcladeParamsPojo;

  #[wasm_bindgen(typescript_type = "AnalysisInputPojo")]
  pub type AnalysisInputPojo;

  #[wasm_bindgen(typescript_type = "AnalysisResultPojo")]
  pub type AnalysisResultPojo;
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct NextcladeParams {
  #[wasm_bindgen(getter_with_clone)]
  pub ref_seq_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub gene_map_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub tree_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub qc_config_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub virus_properties_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub pcr_primers_str: String,
}

#[wasm_bindgen]
impl NextcladeParams {
  pub fn from_js(params: &NextcladeParamsPojo) -> Result<NextcladeParams, JsError> {
    deserialize_js_value::<NextcladeParams>(params)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct AnalysisInput {
  #[wasm_bindgen(getter_with_clone)]
  pub qry_seq_name: String,

  #[wasm_bindgen(getter_with_clone)]
  pub qry_seq_str: String,
}

#[wasm_bindgen]
impl AnalysisInput {
  pub fn from_js(input: &AnalysisInputPojo) -> Result<AnalysisInput, JsError> {
    deserialize_js_value::<AnalysisInput>(input)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct AnalysisResult {
  #[wasm_bindgen(getter_with_clone)]
  pub qry_seq_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub translations_str: String,

  #[wasm_bindgen(getter_with_clone)]
  pub nextclade_outputs_str: String,
}

#[wasm_bindgen]
impl AnalysisResult {
  pub fn to_js(&self) -> Result<AnalysisResultPojo, JsError> {
    serialize_js_value::<AnalysisResult, AnalysisResultPojo>(self)
  }
}

pub struct Nextclade {
  ref_seq: Vec<Nuc>,
  ref_peptides: TranslationMap,
  gene_map: GeneMap,
  primers: Vec<PcrPrimer>,
  tree: AuspiceTree,
  qc_config: QcConfig,
  virus_properties: VirusProperties,
  gap_open_close_nuc: Vec<i32>,
  gap_open_close_aa: Vec<i32>,
  clade_node_attr_key_descs: Vec<CladeNodeAttrKeyDesc>,
  aln_params: AlignPairwiseParams,
}

impl Nextclade {
  pub fn new(params: &NextcladeParams) -> Result<Self, Report> {
    let NextcladeParams {
      ref_seq_str,
      gene_map_str,
      tree_str,
      qc_config_str,
      virus_properties_str,
      pcr_primers_str,
    } = params;

    let aln_params = AlignPairwiseParams::default();

    let ref_record = read_one_fasta_str(ref_seq_str).wrap_err("When parsing reference sequence")?;
    let ref_seq = to_nuc_seq(&ref_record.seq).wrap_err("When converting reference sequence")?;

    let gene_map = read_gff3_str(gene_map_str).wrap_err("When parsing gene map")?;

    let gap_open_close_nuc = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &aln_params);

    let gap_open_close_aa = get_gap_open_close_scores_flat(&ref_seq, &aln_params);

    let ref_peptides =
      translate_genes_ref(&ref_seq, &gene_map, &aln_params).wrap_err("When translating reference genes")?;

    let mut tree = AuspiceTree::from_str(tree_str).wrap_err("When parsing reference tree Auspice JSON v2")?;
    tree_preprocess_in_place(&mut tree, &ref_seq, &ref_peptides).unwrap();
    let clade_node_attr_key_descs = (&tree.meta.extensions.nextclade.clade_node_attrs).clone();

    let qc_config = QcConfig::from_str(qc_config_str).wrap_err("When parsing QC config JSON")?;

    let virus_properties =
      VirusProperties::from_str(virus_properties_str).wrap_err("When parsing virus properties JSON")?;

    let primers = PcrPrimer::from_str(pcr_primers_str, &from_nuc_seq(&ref_seq)).wrap_err("When parsing PCR primers")?;

    Ok(Self {
      ref_seq,
      ref_peptides,
      gene_map,
      primers,
      tree,
      qc_config,
      virus_properties,
      gap_open_close_nuc,
      gap_open_close_aa,
      clade_node_attr_key_descs,
      aln_params,
    })
  }

  pub fn get_clade_node_attr_key_descs(&self) -> Vec<CladeNodeAttrKeyDesc> {
    self.clade_node_attr_key_descs.clone()
  }

  pub fn run(&mut self, input: &AnalysisInput) -> Result<AnalysisResult, Report> {
    let AnalysisInput {
      qry_seq_name,
      qry_seq_str,
    } = input;

    let qry_record = &read_one_fasta_str(qry_seq_str).wrap_err("When parsing query sequence")?;
    let qry_seq = &to_nuc_seq(&qry_record.seq).wrap_err("When converting query sequence")?;

    let (qry_seq_aligned_stripped, translations, nextclade_outputs) = nextclade_run_one(
      qry_seq_name,
      qry_seq,
      &self.ref_seq,
      &self.ref_peptides,
      &self.gene_map,
      &self.primers,
      &self.tree,
      &self.qc_config,
      &self.virus_properties,
      &self.gap_open_close_nuc,
      &self.gap_open_close_aa,
      &self.aln_params,
    )
    .wrap_err_with(|| format!("When running Nextclade for sequence '{qry_seq_name}'"))?;

    let nextclade_outputs_str =
      json_stringify(&nextclade_outputs).wrap_err("When serializing output results of Nextclade")?;

    let translations_final = translations.iter().map(|tr| {});
    let translations_str = json_stringify(&translations).wrap_err("When serializing output translations")?;

    let qry_seq_str = from_nuc_seq(&qry_seq_aligned_stripped);

    Ok(AnalysisResult {
      qry_seq_str,
      translations_str,
      nextclade_outputs_str,
    })
  }

  pub fn get_output_tree(&mut self, nextclade_outputs: &[NextcladeOutputs]) -> &AuspiceTree {
    tree_attach_new_nodes_in_place(&mut self.tree, nextclade_outputs);
    &self.tree
  }
}
