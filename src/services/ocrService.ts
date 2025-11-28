import Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface WordData {
    text: string;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export class OCRService {
    /**
     * Preprocess image to improve OCR accuracy for decimal numbers
     */
    private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
        try {
            // Enhance image: increase contrast, convert to grayscale, sharpen
            return await sharp(imageBuffer)
                .greyscale()
                .normalize() // Auto-adjust contrast
                .sharpen()
                .toBuffer();
        } catch (error) {
            console.log('Image preprocessing failed, using original:', error);
            return imageBuffer;
        }
    }

    /**
     * Parse number from text, handling missing decimals
     */
    private parseNumber(text: string): number | null {
        // Try to parse as decimal first
        const decimalMatch = text.match(/(\d+)\.(\d{1,2})/);
        if (decimalMatch) {
            return parseFloat(text);
        }

        // Try as integer
        const num = parseInt(text.replace(/[^\d]/g, ''));
        if (isNaN(num)) {
            return null;
        }

        // Heuristic: if number >= 100, likely missing decimal point
        if (num >= 100) {
            // Convert 112 -> 1.12, 842 -> 8.42, 162525 -> 1625.25
            return num / 100;
        }

        return num;
    }

    /**
     * Extract numbers from HTML div content
     */
    extractFromHTML(htmlContent: string): number[] {
        const numbers: number[] = [];

        // Extract all text content from span tags
        const spanPattern = /<span[^>]*>([^<]+)<\/span>/g;
        let match;

        while ((match = spanPattern.exec(htmlContent)) !== null) {
            const text = match[1].trim();
            const num = parseFloat(text);

            if (!isNaN(num) && num >= 0.01 && num <= 10000) {
                numbers.push(Math.round(num * 100) / 100);
            }
        }

        console.log(`Extracted ${numbers.length} numbers from HTML`);
        return numbers;
    }

    /**
     * Extract numbers from an image buffer
     * Returns an array of numbers found in the image, sorted spatially (left-to-right, top-to-bottom)
     */
    async extractNumbers(imageBuffer: Buffer): Promise<number[]> {
        try {
            // Preprocess image for better OCR
            const processedBuffer = await this.preprocessImage(imageBuffer);

            // Recognize with word-level data to get coordinates
            const result = await Tesseract.recognize(processedBuffer, 'eng', {
                logger: (m) => console.log(m),
            });

            console.log('OCR Raw Text:', result.data.text);

            // Extract words with their bounding boxes from lines
            const words: WordData[] = [];

            // Type assertion needed as Tesseract types may not include all properties
            const data = result.data as any;

            if (data.lines) {
                for (const line of data.lines) {
                    if (line.words) {
                        for (const word of line.words) {
                            if (word.text && word.bbox) {
                                words.push({
                                    text: word.text,
                                    bbox: word.bbox,
                                });
                            }
                        }
                    }
                }
            }

            console.log(`Found ${words.length} words with coordinates`);

            // Sort words spatially: top-to-bottom, then left-to-right
            // Group by rows (similar y-coordinates), then sort by x within each row
            const rowTolerance = 10; // pixels tolerance for same row

            words.sort((a, b) => {
                const yDiff = a.bbox.y0 - b.bbox.y0;
                if (Math.abs(yDiff) < rowTolerance) {
                    // Same row, sort by x
                    return a.bbox.x0 - b.bbox.x0;
                }
                // Different rows, sort by y
                return yDiff;
            });

            // Extract and parse numbers
            const numbers: number[] = [];
            for (const word of words) {
                const num = this.parseNumber(word.text);
                if (num !== null && num >= 0.01 && num <= 10000) {
                    numbers.push(Math.round(num * 100) / 100);
                }
            }

            console.log(`Extracted ${numbers.length} numbers in spatial order:`, numbers.slice(0, 10), '...');

            return numbers;
        } catch (error) {
            console.error('OCR Error:', error);
            throw new Error('Failed to extract numbers from image');
        }
    }
}
