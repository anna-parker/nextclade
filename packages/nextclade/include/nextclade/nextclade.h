#pragma once

#include <nextalign/nextalign.h>

#include <map>
#include <optional>


namespace Nextclade {
  class Tree;

  struct QCRulesConfigMissingData {
    bool enabled;
    double missingDataThreshold;
    double scoreBias;
  };

  struct QCRulesConfigMixedSites {
    bool enabled;
    double mixedSitesThreshold;
  };

  struct QCRulesConfigPrivateMutations {
    bool enabled;
    double typical;
    double cutoff;
  };

  struct QCRulesConfigSnpClusters {
    bool enabled;
    double windowSize;
    double clusterCutOff;
    double scoreWeight;
  };

  struct QcConfig {
    QCRulesConfigMissingData missingData;
    QCRulesConfigMixedSites mixedSites;
    QCRulesConfigPrivateMutations privateMutations;
    QCRulesConfigSnpClusters snpClusters;
  };

  enum class QcStatus : char {
    good = 1,
    mediocre = 2,
    bad = 3,
  };


  struct QCResultMixedSites {
    double score;
    QcStatus status;
    int totalMixedSites;
    double mixedSitesThreshold;
  };

  struct ClusteredSnp {
    int start;
    int end;
    int numberOfSNPs;
  };

  struct QCResultSnpClusters {
    double score;
    QcStatus status;
    int totalSNPs;
    std::vector<ClusteredSnp> clusteredSNPs;
  };

  struct QcResultMissingData {
    double score;
    QcStatus status;
    int totalMissing;
    double missingDataThreshold;
  };

  struct QcResultPrivateMutations {
    double score;
    QcStatus status;
    double total;
    double excess;
    double cutoff;
  };


  struct QcResult {
    std::optional<QcResultMissingData> missingData;
    std::optional<QCResultMixedSites> mixedSites;
    std::optional<QcResultPrivateMutations> privateMutations;
    std::optional<QCResultSnpClusters> snpClusters;
    double overallScore;
    QcStatus overallStatus;
  };

  struct PcrPrimer {};

  struct PcrPrimerChange {};

  struct NextcladeOptions {
    NucleotideSequence ref;
    std::string treeString;
    std::vector<PcrPrimer> pcrPrimers;
    GeneMap geneMap;
    QcConfig qcRulesConfig;
    NextalignOptions nextalignOptions;
  };

  struct NucleotideSubstitution {
    Nucleotide refNuc;
    int pos;
    Nucleotide queryNuc;
  };

  struct NucleotideDeletion {
    int start;
    int length;
  };

  struct NucleotideInsertion {
    int pos;
    int length;
    NucleotideSequence ins;
  };

  struct NucleotideRange {
    int begin;
    int end;
    int length;
    Nucleotide nuc;
  };

  struct AnalysisResult {
    std::vector<NucleotideSubstitution> substitutions;
    std::vector<NucleotideDeletion> deletions;
    std::vector<NucleotideInsertion> insertions;
    int alignmentStart;
    int alignmentEnd;
  };

  struct NextcladeResult {
    std::string seqName;
    std::vector<NucleotideSubstitution> substitutions;
    int totalSubstitutions;
    std::vector<NucleotideDeletion> deletions;
    int totalDeletions;
    std::vector<NucleotideInsertion> insertions;
    int totalInsertions;
    std::vector<NucleotideRange> missing;
    int totalMissing;
    std::vector<NucleotideRange> nonACGTNs;
    int totalNonACGTNs;
    int alignmentStart;
    int alignmentEnd;
    int alignmentScore;
    int nearestNodeId;
    std::map<Nucleotide, int> nucleotideComposition;
    std::vector<PcrPrimerChange> pcrPrimerChanges;
    int totalPcrPrimerChanges;
    std::string clade;
    QcResult qc;
  };

  class NextcladeAlgorithmImpl;

  class NextcladeAlgorithm {
    std::unique_ptr<NextcladeAlgorithmImpl> pimpl;

  public:
    explicit NextcladeAlgorithm(const NextcladeOptions& options);

    NextcladeResult run(const std::string& seqName, const NucleotideSequence& seq);

    const Tree& finalize();

    // Destructor is required when using pimpl idiom with unique_ptr.
    // See "Effective Modern C++" by Scott Meyers,
    // "Item 22: When using the Pimpl Idiom, define special member functions in the implementation file".
    ~NextcladeAlgorithm();
    NextcladeAlgorithm(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm(NextcladeAlgorithm&& other) noexcept = delete;
    NextcladeAlgorithm& operator=(const NextcladeAlgorithm& other) = delete;
    NextcladeAlgorithm& operator=(NextcladeAlgorithm&& other) noexcept = delete;
  };

  const char* getVersion();
}// namespace Nextclade
