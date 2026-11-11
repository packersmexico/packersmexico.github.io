// Keep routine Jotform submission reads on the existing read-only API key.
// Provider webhook management, form activation and staged-form edits can use
// an optional dedicated Full-Access key. Neither key is sent to the browser.
export function chooseJotformCredential({path,method='GET',readKey='',controlKey=''}) {
  const normalizedMethod=String(method).toUpperCase();
  const normalizedPath=String(path).split('?')[0];
  const needsControl=normalizedMethod!=='GET' ||
    /^\/form\/\d{10,25}\/webhooks$/.test(normalizedPath);
  const read=typeof readKey==='string'?readKey:'';
  const control=typeof controlKey==='string'?controlKey:'';
  return needsControl?(control||read):(read||control);
}
