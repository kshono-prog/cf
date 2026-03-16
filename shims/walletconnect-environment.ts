type BrowserCryptoLike = {
  subtle?: SubtleCrypto;
  webkitSubtle?: SubtleCrypto;
};

function getGlobalScope(): typeof globalThis {
  return globalThis;
}

export function isReactNative(): boolean {
  return (
    typeof document === "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.product === "ReactNative"
  );
}

export function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof process.versions !== "undefined" &&
    typeof process.versions.node !== "undefined"
  );
}

export function isBrowser(): boolean {
  return !isReactNative() && !isNode();
}

export function getBrowerCrypto(): BrowserCryptoLike {
  const scope = getGlobalScope() as typeof globalThis & {
    msCrypto?: BrowserCryptoLike;
  };

  return (scope.crypto as BrowserCryptoLike | undefined) ?? scope.msCrypto ?? {};
}

export function getSubtleCrypto(): SubtleCrypto | undefined {
  const browserCrypto = getBrowerCrypto();
  return browserCrypto.subtle ?? browserCrypto.webkitSubtle;
}

export function isBrowserCryptoAvailable(): boolean {
  return Boolean(getSubtleCrypto());
}
