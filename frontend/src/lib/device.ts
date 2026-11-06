/** Phone model, when the browser shares it (Chrome on Android). iPhones never share it, so they show as "iPhone". */
export async function deviceModel(): Promise<string> {
  try {
    const uad = (navigator as any).userAgentData;
    if (uad?.getHighEntropyValues) return (await uad.getHighEntropyValues(["model"])).model || "";
  } catch { /* the browser said no */ }
  return "";
}
