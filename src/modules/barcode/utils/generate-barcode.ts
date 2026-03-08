import QRCode from 'qrcode';

/**
 * Generates a QR code PNG buffer for a commodity code.
 * The QR data is just the code string — scannable to autofill commodity search.
 */
export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  const buffer = await QRCode.toBuffer(data, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return buffer;
}
