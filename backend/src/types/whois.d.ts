// Basic module declaration for 'whois' as official types are not available.
// This tells TypeScript that the module exists and can be imported.
// You might want to expand this with more specific types if needed.

declare module 'whois' { // Changed module name to 'whois'
  interface WhoisResult {
    server: string; // The WHOIS server that provided the data
    data: string;   // The raw WHOIS data as a string
    [key: string]: any; // Allow other properties as WHOIS data can be varied
  }

  // Define the lookup function signature
  // The callback receives an error or the data (string or array of WhoisResult or single WhoisResult)
  // The 'whois' package seems to sometimes return a single object or string directly, not always array.
  function lookup(
    domain: string, 
    options?: {
      server?: string | { host: string; port?: number; query?: string; };    // WHOIS server to query
      follow?: number;    // Number of redirects to follow
      timeout?: number;   // Timeout in milliseconds
      verbose?: boolean;  // Verbose output
      bind?: string;      // Bind to a specific IP address
      proxy?: string | { ipaddress: string; port: number; type: number; }; // SOCKS5 proxy
      raw?: boolean;      // Return raw data instead of parsed object (if parsing is supported)
    } | ((err: Error | null, data: string | WhoisResult | WhoisResult[]) => void), 
    callback?: (err: Error | null, data: string | WhoisResult | WhoisResult[]) => void
  ): void;

  export { lookup, WhoisResult };
}
