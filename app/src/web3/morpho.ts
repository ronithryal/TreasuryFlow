export async function depositToMorpho(amount: number) {
  await new Promise(r => setTimeout(r, 1500));
  return { success: true, mUsdcAmount: amount, hash: '0xmorpho' + Date.now() };
}

export async function withdrawFromMorpho(amount: number) {
  await new Promise(r => setTimeout(r, 1500));
  return { success: true, usdcAmount: amount, hash: '0xmorpho' + Date.now() };
}
