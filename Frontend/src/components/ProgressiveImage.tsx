import { useState, useEffect, SyntheticEvent } from 'react';
import { Box, Skeleton } from '@mui/material';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  height?: number | string;
  width?: string | number;
  sx?: Record<string, unknown>;
  fallbackSrc?: string;
}

function ProgressiveImage({ src, alt, height = 200, width = '100%', sx = {}, fallbackSrc }: ProgressiveImageProps) {
  const [lowQualitySrc, setLowQualitySrc] = useState<string>('');
  const [highQualitySrc, setHighQualitySrc] = useState<string>('');
  const [isHighQualityLoaded, setIsHighQualityLoaded] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Generate low-quality placeholder URL
  const getLowQualityUrl = (url: string): string => {
    // For LoremFlickr, use a smaller size (50x50) as placeholder
    // Format: https://loremflickr.com/400/400/keywords?random=id
    if (url.includes('loremflickr.com')) {
      return url.replace(/\/\d+\/\d+\//, '/50/50/');
    }
    // For Picsum Photos, use smaller size
    // Format: https://picsum.photos/seed/seed/400/400
    if (url.includes('picsum.photos')) {
      return url.replace(/\/\d+\/\d+(\?|$)/, '/50/50$1');
    }
    // For other URLs, use the original but will apply blur effect
    return url;
  };

  const finalFallback = fallbackSrc || `https://picsum.photos/seed/${alt}/50/50`;

  useEffect(() => {
    // Reset state when src changes
    setIsHighQualityLoaded(false);
    setHasError(false);

    // Set low-quality source immediately
    const lowQuality = getLowQualityUrl(src);
    setLowQualitySrc(lowQuality);
    setHighQualitySrc(src);

    // Preload high-quality image
    const highQualityImg = new Image();
    highQualityImg.onload = () => {
      setIsHighQualityLoaded(true);
    };
    highQualityImg.onerror = () => {
      // If high-quality fails, try fallback
      if (fallbackSrc) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setHighQualitySrc(fallbackSrc);
          setIsHighQualityLoaded(true);
        };
        fallbackImg.onerror = () => {
          setHasError(true);
        };
        fallbackImg.src = fallbackSrc;
      } else {
        setHasError(true);
      }
    };
    highQualityImg.src = src;
  }, [src, fallbackSrc]);

  const handleLowQualityError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== finalFallback) {
      target.onerror = null; // Prevent infinite loop
      setLowQualitySrc(finalFallback);
    }
  };

  const handleHighQualityError = (e: SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src !== finalFallback) {
      target.onerror = null; // Prevent infinite loop
      setHighQualitySrc(finalFallback);
      setIsHighQualityLoaded(true);
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: width,
        height: height,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        ...sx,
      }}
    >
      {/* Low-quality placeholder - always visible until high-quality loads */}
      {lowQualitySrc && (
        <Box
          component="img"
          src={lowQualitySrc}
          alt={alt}
          onError={handleLowQualityError}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isHighQualityLoaded ? 'blur(0px)' : 'blur(10px)',
            transform: isHighQualityLoaded ? 'scale(1)' : 'scale(1.1)',
            transition: 'opacity 0.4s ease-in-out, filter 0.4s ease-in-out, transform 0.4s ease-in-out',
            opacity: isHighQualityLoaded ? 0 : 1,
          }}
        />
      )}
      
      {/* High-quality image - fades in when loaded */}
      {highQualitySrc && isHighQualityLoaded && (
        <Box
          component="img"
          src={highQualitySrc}
          alt={alt}
          onError={handleHighQualityError}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0,
            animation: 'fadeIn 0.4s ease-in-out forwards',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        />
      )}

      {/* Loading skeleton - shown only when no image has loaded */}
      {!lowQualitySrc && !hasError && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
    </Box>
  );
}

export default ProgressiveImage;

