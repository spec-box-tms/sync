import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface HistoryEntry {
  commit: string;
  author: string;
  date: string;
  message: string;
}

export type GitStatus = 'clean' | 'modified' | 'untracked';

export interface GitAdapter {
  history(root: string, filePath: string): Promise<HistoryEntry[]>;
  fileAtRevision(root: string, filePath: string, commit: string): Promise<Buffer | undefined>;
}

const gitText = async (root: string, args: string[]) => (await exec('git', args, { cwd: root })).stdout.trim();
const gitBytes = async (root: string, args: string[]) => (await exec('git', args, { cwd: root, encoding: 'buffer' })).stdout;

export const getHistory = async (root: string, filePath: string): Promise<HistoryEntry[]> => {
  try {
    const stdout = await gitText(root, ['log', '--format=%H%x1f%an%x1f%cI%x1f%s', '--', filePath]);
    return stdout ? stdout.split('\n').map((line) => {
      const [commit, author, date, message] = line.split('\x1f');
      return { commit, author, date, message };
    }) : [];
  } catch {
    return [];
  }
};

export const getFileAtRevision = async (root: string, filePath: string, commit: string): Promise<Buffer | undefined> => {
  try {
    const commits = await gitText(root, ['log', '--format=%H', '--', filePath]);
    if (!commits.split('\n').includes(commit)) return undefined;
    return await gitBytes(root, ['show', `${commit}:${filePath}`]);
  } catch {
    return undefined;
  }
};

export const getStatus = async (root: string, filePath: string): Promise<GitStatus> => {
  try {
    const status = await gitText(root, ['status', '--porcelain', '--', filePath]);
    return status.startsWith('??') ? 'untracked' : status ? 'modified' : 'clean';
  } catch {
    return 'clean';
  }
};

export const gitAdapter: GitAdapter = {
  history: getHistory,
  fileAtRevision: getFileAtRevision,
};
