// Basic module declaration for 'node-whois' as official types are not available.
// This tells TypeScript that the module exists and can be imported.
// You might want to expand this with more specific types if needed.

declare module 'node-whois' {
  interface WhoisResult {
    server: string; // The WHOIS server that provided the data
    data: string;   // The raw WHOIS data as a string
  }

  // Define the lookup function signature
  // The callback receives an error or the data (string or array of WhoisResult)
  function lookup(
    domain: string, 
    options?: {
      server?: string;    // WHOIS server to query
      follow?: number;    // Number of redirects to follow
      timeout?: number;   // Timeout in milliseconds
      verbose?: boolean;  // Verbose output
      bind?: string;      // Bind to a specific IP address
      proxy?: string | { ipaddress: string; port: number; type: number; }; // SOCKS5 proxy
    } | ((err: Error | null, data: string | WhoisResult[]) => void), 
    callback?: (err: Error | null, data: string | WhoisResult[]) => void
  ): void;

  // If you only use the promise-wrapped version, you might not need to export 'lookup' directly
  // but it's good to have for completeness if someone uses the callback version.
  export { lookup, WhoisResult }; // Exporting what the library provides
}
