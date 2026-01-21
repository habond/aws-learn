# Sample Images for Rekognition Testing

This directory should contain sample images for testing Amazon Rekognition features.

## Recommended Test Images

1. **test-faces.jpg** - Image with multiple faces for facial analysis
2. **test-text.jpg** - Image with text for OCR testing
3. **test-objects.jpg** - Image with various objects for label detection
4. **test-scene.jpg** - Landscape or scene image for scene detection

## Where to Get Sample Images

- Use your own images (ensure you have rights to use them)
- Use free stock photo sites like Unsplash, Pexels
- Use AWS sample images from public datasets

## Upload Instructions

```bash
# Upload images to S3 for testing
aws s3 cp test-image.jpg s3://your-image-bucket/test-image.jpg
```

## Important Notes

- Ensure images are in supported formats (JPEG, PNG)
- Images should be under 15MB for Rekognition
- Respect copyright and privacy when using images
