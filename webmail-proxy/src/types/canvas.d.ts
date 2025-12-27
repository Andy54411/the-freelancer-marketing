declare module 'canvas' {
  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(src: string | Buffer): Promise<Image>;
  
  export interface Canvas {
    width: number;
    height: number;
    getContext(contextId: '2d'): CanvasRenderingContext2D;
    toBuffer(mimeType: 'image/png' | 'image/jpeg'): Buffer;
  }
  
  export interface Image {
    width: number;
    height: number;
  }
  
  export interface CanvasRenderingContext2D {
    fillStyle: string | CanvasGradient | CanvasPattern;
    fillRect(x: number, y: number, width: number, height: number): void;
    drawImage(image: Image, dx: number, dy: number, dw: number, dh: number): void;
  }
}

declare module 'pdfjs-dist' {
  export function getDocument(params: {
    data: Uint8Array;
    useSystemFonts?: boolean;
    disableFontFace?: boolean;
  }): PDFDocumentLoadingTask;
  
  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }
  
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }
  
  export interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport;
    render(params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PDFPageViewport;
    }): PDFRenderTask;
  }
  
  export interface PDFPageViewport {
    width: number;
    height: number;
  }
  
  export interface PDFRenderTask {
    promise: Promise<void>;
  }
}
