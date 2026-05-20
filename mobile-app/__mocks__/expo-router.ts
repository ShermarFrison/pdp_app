export const __pushCalls: Array<{ pathname: string; params: Record<string, string> }> = [];
export const __reset = () => {
  __pushCalls.length = 0;
};
export const router = {
  push: jest.fn((arg: { pathname: string; params: Record<string, string> }) => {
    __pushCalls.push(arg);
  }),
};
