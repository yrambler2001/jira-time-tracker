// https://stackoverflow.com/a/2117523
function uuidv4() {
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16));
}

export const randomUUID = () => {
  // https://stackoverflow.com/questions/74911304/crypto-module-not-loading-randomuuid-when-viewing-a-local-network-ip-address
  if (typeof window.crypto?.randomUUID === 'function') return crypto.randomUUID();
  return uuidv4();
};
