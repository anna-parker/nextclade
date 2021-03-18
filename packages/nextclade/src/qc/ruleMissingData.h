#pragma once

#include <vector>
#include <optional>

namespace Nextclade {
  struct NextcladeResult;
  struct NucleotideSubstitution;
  struct QcResultMissingData;
  struct QCRulesConfigMissingData;

  std::optional<QcResultMissingData> ruleMissingData(                   //
    const NextcladeResult& result,                       //
    const std::vector<NucleotideSubstitution>& mutations,//
    const QCRulesConfigMissingData& config               //
  );
}// namespace Nextclade
