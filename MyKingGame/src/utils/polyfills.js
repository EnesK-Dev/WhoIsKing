// Hermes / React Native ortamında bulunmayan browser global'leri için polyfill'ler.
// NOT: `typeof global.DOMException` Hermes'te property erişimi olduğu için throw eder;
// bare `typeof DOMException` ise ReferenceError vermez, sadece 'undefined' döner.
if (typeof DOMException === 'undefined') {
  function PolyDOMException(message, name) {
    var err = new Error(message);
    err.name = name || 'Error';
    err.code = 0;
    return err;
  }
  PolyDOMException.prototype = Object.create(Error.prototype);
  PolyDOMException.prototype.constructor = PolyDOMException;
  globalThis.DOMException = PolyDOMException;
}
