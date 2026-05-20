export const __calls: string[] = [];
let available = true;
export const __setAvailable = (v: boolean) => {
  available = v;
};
export const __reset = () => {
  __calls.length = 0;
  available = true;
};

export const isAvailableAsync = jest.fn(async () => available);
export const shareAsync = jest.fn(async (uri: string) => {
  __calls.push(uri);
});
