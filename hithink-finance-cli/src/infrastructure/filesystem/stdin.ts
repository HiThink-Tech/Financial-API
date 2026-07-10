/**
 * Shared stdin reader for commands that need piped text input.
 */

export interface ReadStdinOptions {
  stripFinalNewlines?: boolean;
}

export async function readStdin(
  input: AsyncIterable<string | Buffer> = process.stdin,
  options: ReadStdinOptions = {},
): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return options.stripFinalNewlines === true ? text.replace(/[\r\n]+$/u, '') : text;
}
