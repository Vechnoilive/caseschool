"""Regression checks for company counts; no source data or personal IDs required."""
import importlib.util
from pathlib import Path
import unittest
import pandas as pd

spec = importlib.util.spec_from_file_location('analyze_data', Path(__file__).parents[1] / 'scripts/analyze_data.py')
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)


def company(uid, group, okved='46.73', loan='0'):
    return dict(SYNTHETIC_U=uid, GROUP_ID=group, MAINOKVED_CODE=okved,
                CL_TYPE='CLIENT', CL_PRODUCT_LOA_MARK=loan)


class CompanyAggregationTests(unittest.TestCase):
    def test_exact_duplicates_count_once_in_every_company_aggregate(self):
        a = company('A', 'G1', loan='1')
        result = analysis.summarize(pd.DataFrame([a, a, company('B', 'G1')]))
        self.assertEqual(result['rows'], 3)
        self.assertEqual(result['duplicate_companies'], 1)
        self.assertEqual(result['analysis_companies'], 2)
        self.assertEqual(result['companies_in_multi_company_groups'], 2)
        self.assertEqual(result['wholesale_companies'], 2)
        self.assertEqual(result['product_value_counts']['CL_PRODUCT_LOA_MARK']['1'], 1)

    def test_conflicting_id_is_excluded_from_numerator_and_denominator(self):
        rows = [company('A', 'G1'), company('A', 'G2'), company('B', 'G3'),
                company('C', 'G3'), company('D', 'G4')]
        result = analysis.summarize(pd.DataFrame(rows))
        self.assertEqual(result['unique_companies'], 4)
        self.assertEqual(result['analysis_companies'], 3)
        self.assertEqual(result['ambiguous_group_companies'], 1)
        self.assertEqual(result['multi_group_share_pct'], 66.67)
        self.assertEqual(result['candidate_c1_groups'], 1)

    def test_sentinel_and_singleton_ids_do_not_create_holdings(self):
        groups = ['group_NAN', 'group_NAN', '0', '0', 'ONLY_A', 'ONLY_B']
        result = analysis.summarize(pd.DataFrame([company(str(i), g) for i, g in enumerate(groups)]))
        self.assertEqual(result['multi_company_groups'], 0)
        self.assertEqual(result['singleton_group_ids'], 2)
        self.assertEqual(result['multi_group_share_pct'], 0)
        self.assertIsNone(result['group_size_max'])

    def test_missing_product_and_broad_okved_are_preserved(self):
        result = analysis.summarize(pd.DataFrame([
            company('A', 'G1', '46.73', ''), company('B', 'G1', '46.90', '0')]))
        self.assertEqual(result['wholesale_companies'], 2)
        self.assertEqual(result['construction_wholesale_companies'], 1)
        self.assertEqual(result['product_value_counts']['CL_PRODUCT_LOA_MARK'], {'': 1, '0': 1})

    def test_legacy_id_alias_and_other_attribute_conflicts(self):
        rows = [company('A', 'G1', loan='0'), company('A', 'G1', loan='1'), company('B', 'G2')]
        frame = pd.DataFrame(rows).rename(columns={'SYNTHETIC_U': 'SYNTETIC_U'})
        result = analysis.summarize(frame)
        self.assertEqual(result['ambiguous_group_companies'], 0)
        self.assertEqual(result['conflicting_companies'], 1)
        self.assertEqual(result['analysis_companies'], 1)


if __name__ == '__main__':
    unittest.main()
