/** Retry a transient read once; never hammer the server on bad credentials or validation. */
export function retryReadOnce(failures, error) {
  const status = Number(error?.status || error?.response?.status || 0);
  return failures < 1 && (!status || status >= 500);
}
