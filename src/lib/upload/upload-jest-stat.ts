import {
  SpecBoxWebApi,
  SpecBoxWebApiModelStatAutotestsStatUploadData,
} from '../../api';
import { ApiConfig } from '../config/models';
import { TestReport } from '../test-matcher/models';
import { DEFAULT_API_OPTIONS } from '../utils';

export const uploadTestStat = async (
  testReport: TestReport,
  config: ApiConfig,
  version?: string
) => {
  const { host, project } = config;
  const { startTime, total, duration } = testReport;

  const client = new SpecBoxWebApi(host, DEFAULT_API_OPTIONS);

  const body: SpecBoxWebApiModelStatAutotestsStatUploadData = {
    timestamp: new Date(startTime),
    assertionsCount: total,
    duration,
  };

  await client.statUploadAutotests({ project, version, body });
};
