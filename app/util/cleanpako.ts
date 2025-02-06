import * as pako from 'pako';

/**
 * Sanitizes a Uint8Array for use with pako.inflate.
 *
 * This function performs the following steps:
 * 1.  **Null/Undefined Check:** Checks for null or undefined input and handles it gracefully.
 * 2.  **Empty Array Check:** Returns an empty array if the input is an empty array to avoid unnecessary processing.
 * 3.  **Header Check (Basic):** Checks for a potential valid gzip or deflate header. This is a heuristic and not foolproof.
 *     - Gzip: `[31, 139]` (magic number)
 *     - Deflate (zlib, raw): A very basic check to avoid obvious garbage.
 * 4.  **Invalid Byte Removal:** Removes or replaces bytes that are likely to cause `pako.inflate` to hang or throw errors. This is a critical part.
 * 5.  **Truncation (Experimental):** If, after cleaning, the array *still* seems to be causing issues, try truncating it at an arbitrary point. This is a last resort and might result in incomplete data, but can prevent hangs.  It's generally better to log the input and try to understand why it's problematic rather than relying solely on truncation.
 *
 * **Important Considerations:**
 * - This function makes educated guesses and may not handle *every* possible invalid input.
 * - Thorough error handling and logging are essential when dealing with potentially corrupted data.
 * - Consider alternative approaches (like server-side validation) if you have control over the data source.
 *
 * @param data The Uint8Array to sanitize.
 * @returns A sanitized Uint8Array, or an empty array if the input is invalid.
 */
function sanitizeUint8Array(data: Uint8Array | null | undefined): Uint8Array {
  if (!data) {
    console.warn("sanitizeUint8Array: Input data is null or undefined.");
    return new Uint8Array(0);
  }

  if (data.length === 0) {
    return new Uint8Array(0); // Avoid unnecessary processing
  }

  // Basic header check (heuristic)
  const isGzip = data.length >= 2 && data[0] === 31 && data[1] === 139;
  const isDeflateLikely = data.length >= 2 && (data[0] % 31 === 0); // Very loose check, use with caution

  if (!isGzip && !isDeflateLikely) {
    console.warn("sanitizeUint8Array: Potentially invalid header.  Assuming raw data or corrupted.");
    // If you expect raw data, you might skip the inflate altogether.
    // return data; // Comment out if you still want to try inflating *something*.
  }


  // Create a copy to avoid modifying the original data
  let sanitizedData = new Uint8Array(data);
  let modified = false;

  // Invalid byte removal/replacement
  for (let i = 0; i < sanitizedData.length; i++) {
    // Example: Replace invalid characters (e.g., control characters) with 0.
    if (sanitizedData[i] < 0x20 && sanitizedData[i] !== 0x09 && sanitizedData[i] !== 0x0A && sanitizedData[i] !== 0x0D) {
      // These are most of the common ASCII control characters
      sanitizedData[i] = 0; // Replace with null byte
      modified = true;
      console.warn(`sanitizeUint8Array: Replacing invalid byte at index ${i}: ${data[i]} -> 0`);
    }

    // Example: Remove high ASCII characters (outside of standard ASCII range)
    // This depends on the expected encoding. If you expect UTF-8, don't do this!
    if (sanitizedData[i] > 127) {
      console.warn(`sanitizeUint8Array: Removing extended ASCII byte at index ${i}: ${data[i]}`);
      modified = true;

      // Option 1: Replace with a safe character (e.g., space or a specific character).
      // sanitizedData[i] = 32; // Replace with space.

      // Option 2: Remove the byte by shifting the remaining bytes left
      const temp = new Uint8Array(sanitizedData.length - 1);
      temp.set(sanitizedData.slice(0, i));
      temp.set(sanitizedData.slice(i + 1));
      sanitizedData = temp;
      i--; // Adjust the index after removing the byte
    }
  }

  if (modified) {
    console.warn("sanitizeUint8Array: Sanitized the input data.");
  }


  // EXPERIMENTAL: Truncation (Last Resort)
  // If, after the above cleaning, pako is still hanging, try truncating the data.
  // This is a crude approach and will likely result in incomplete or corrupt data.
  const TRUNCATE_LENGTH = 1024 * 10; // Arbitrary truncation length (10KB)
  if (sanitizedData.length > TRUNCATE_LENGTH) {
    console.warn(`sanitizeUint8Array: Truncating data to ${TRUNCATE_LENGTH} bytes as a last resort.`);
    sanitizedData = sanitizedData.slice(0, TRUNCATE_LENGTH);
  }

  return sanitizedData;
}


/**
 * Attempts to inflate a Uint8Array using pako.inflate, handling potential errors.
 * @param data The Uint8Array to inflate.
 * @returns The inflated Uint8Array, or null if an error occurred.
 */
function tryInflate(data: Uint8Array): Uint8Array | null {
  try {
    const inflatedData = pako.inflate(data);
    return inflatedData;
  } catch (error: any) {
    console.error("pako.inflate error:", error);
    return null;
  }
}



// Example Usage:
const potentiallyCorruptedData: Uint8Array = new Uint8Array([
  31, 139, 8, 0, 0, 0, 0, 0, 0, 0, 115, 74, 203, 72,
  205, 201, 201, 215, 79, 202, 73, 85, 48, 203, 77,
  81, 4, 0, 141, 203, 31, 72, 12, 0, 0, 0,
  // Add some garbage bytes
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x7F, // Control Character
  255, 254, 253,
  31, 139, 8, 0, 0, 0, 0, 0, 0, 0, 115, 74, 203, 72,
  205, 201, 201, 215, 79, 202, 73, 85, 48, 203, 77,
  81, 4, 0, 141, 203, 31, 72, 12, 0, 0, 0,
  // Add some garbage bytes
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x7F, // Control Character
  255, 254, 253,
]);



const sanitized = sanitizeUint8Array(potentiallyCorruptedData);

if (sanitized.length > 0) {
  const inflated = tryInflate(sanitized);

  if (inflated) {
    const decodedString = new TextDecoder().decode(inflated);
    console.log("Inflated data:", decodedString);
  } else {
    console.error("Failed to inflate sanitized data.");
  }
} else {
  console.error("Sanitized data is empty, unable to inflate.");
}

export { sanitizeUint8Array, tryInflate }
