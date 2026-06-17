import fs from 'fs';

function unlinkImage(imagePaths: string | string[]): void {
  const paths = typeof imagePaths === 'string' ? [imagePaths] : imagePaths;

  paths.forEach((imagePath: string) => {
    fs.unlink(imagePath, (_err: NodeJS.ErrnoException | null) => {
      // Ignore file removal errors because this helper is used for cleanup only.
    });
  });
}

export default unlinkImage;
