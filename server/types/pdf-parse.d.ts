declare module 'pdf-parse' {
  interface PDFOptions {
    pagerender?: (pageData: any) => string;
    max?: number;
    version?: string;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    text: string;
    version: string;
  }

  function parse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  
  export = parse;
}