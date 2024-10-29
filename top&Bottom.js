const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// DIFFERENT WIDTH
const sizes = [
  3840, 3440, 2560, 2048, 1920, 1680, 1600, 1536, 1440,
  1366, 1360, 1280, 1024, 960, 800, 768, 720, 640, 480, 425,
  375, 360, 320,
];

// ASPECT RATIO (1500:719)
const aspectRatioWidth = 1500;
const aspectRatioHeight = 719;

// QUALITY FOR AVIF COMPRESSION
const quality = 50;

// FUNCTION TO CREATE THE OUTPUT DIR
function ensureDirectoryExistence(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// FUNCTION TO RESIZE THE IMAGES TO THE SPEC
async function resizeAndCropImages(inputPath, outputPath) {
  ensureDirectoryExistence(outputPath);

  const files = fs
    .readdirSync(inputPath)
    .filter((file) => /\.(jpg|jpeg|png)$/i.test(file));

  for (const file of files) {
    const inputFilePath = path.join(inputPath, file);
    const fileName = path.parse(file).name;

    for (const width of sizes) {
      try {
        // RESIZE THE IMAGE TO THE TARGET WIDTH AND SAVE A TEMP
        const resizedImageBuffer = await sharp(
          inputFilePath
        )
          .resize({ width }) // RESIZE TO THE LARGEST WIDTH
          .toBuffer();

        // GET THE METADATA OF THE RESIZED IMAGE
        const resizedMetadata = await sharp(
          resizedImageBuffer
        ).metadata();
        const actualHeight = resizedMetadata.height;
        const targetHeight = Math.round(
          (width * aspectRatioHeight) / aspectRatioWidth
        );

        if (actualHeight < targetHeight) {
          console.log(
            `Skipping ${fileName} at width ${width}: Target height ${targetHeight} exceeds resized image height ${actualHeight}. ‼️`
          );
          continue;
        }

        // CROP FROM THE TOP
        const outputFilePathTop = path.join(
          outputPath,
          `${fileName}-${width}-top.avif`
        );
        await sharp(resizedImageBuffer)
          .extract({
            left: 0,
            top: 0,
            width,
            height: targetHeight,
          })
          .avif({ quality: quality }) // OUTPUT IN AVIF FORMAT
          .toFile(outputFilePathTop);

        console.log(`Created ${outputFilePathTop}`);

        // CROP FROM THE BOTTOM
        const topFromBottom = actualHeight - targetHeight; // CALCULATE STARTING POINT FROM BOTTOM

        if (topFromBottom >= 0) {
          const outputFilePathBottom = path.join(
            outputPath,
            `${fileName}-${width}-bottom.avif`
          );
          await sharp(resizedImageBuffer)
            .extract({
              left: 0,
              top: topFromBottom, // SET TO START FROM BOTTOM
              width,
              height: targetHeight,
            })
            .avif({ quality: quality })
            .toFile(outputFilePathBottom);

          console.log(`Created ${outputFilePathBottom}`);
        } else {
          console.log(
            `Skipping bottom crop for ${fileName} at width ${width}: Invalid top position. ‼️`
          );
        }
      } catch (error) {
        console.error(
          `Error processing ${file} at width ${width}:`,
          error
        );
      }
    }
  }
  console.log(
    "Image resizing, dual cropping, and AVIF conversion completed. ✅"
  );
}

const inputPath = path.resolve("/Users/sai/Desktop/images");
const outputPath = path.resolve(
  "/Users/sai/Desktop/output"
);
resizeAndCropImages(inputPath, outputPath);
