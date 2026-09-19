export const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

export const resourceUrl = (url: string) =>
  isHttpUrl(url) ? url : `/api/files?path=${encodeURIComponent(url)}`;

export const isHtmlResource = (url: string) => {
  if (!isHttpUrl(url)) return /\.html$/i.test(url);
  try {
    return /\.html$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};
