import React, { useState, useRef, useEffect, memo } from 'react';
import { useIntersectionObserver } from './LazyComponents';

// WebP support detection
const supportsWebP = () => {
  return new Promise(resolve => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

// Generate responsive image URLs
const generateImageUrl = (baseUrl, options = {}) => {
  const { width, height, format = 'auto', quality = 80 } = options;
  
  if (!baseUrl) return '';
  
  // If it's already a full URL or has parameters, return as-is
  if (baseUrl.startsWith('http') || baseUrl.includes('?')) {
    return baseUrl;
  }
  
  // Build URL with parameters
  const params = new URLSearchParams();
  if (width) params.append('w', width);
  if (height) params.append('h', height);
  if (format !== 'auto') params.append('f', format);
  if (quality !== 80) params.append('q', quality);
  
  const paramString = params.toString();
  return paramString ? `${baseUrl}?${paramString}` : baseUrl;
};

// Optimized Image Component
const OptimizedImage = memo(({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  lazy = true,
  webp = true,
  quality = 80,
  sizes = '100vw',
  priority = false,
  onLoad,
  onError,
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [supportsWebPFormat, setSupportsWebPFormat] = useState(false);
  const imgRef = useRef();
  
  const isVisible = lazy ? useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px',
  }) : true;

  // Check WebP support
  useEffect(() => {
    if (webp) {
      supportsWebP().then(setSupportsWebPFormat);
    }
  }, [webp]);

  // Generate image source
  useEffect(() => {
    if (!src || !isVisible) return;

    const generateSrc = async () => {
      try {
        let finalSrc = src;
        
        // Add WebP support if available
        if (webp && supportsWebPFormat && !src.includes('.webp')) {
          // Try WebP version first
          const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          finalSrc = webpSrc;
        }

        // Generate optimized URL
        const optimizedSrc = generateImageUrl(finalSrc, {
          width,
          height,
          format: webp && supportsWebPFormat ? 'webp' : 'auto',
          quality,
        });

        setImageSrc(optimizedSrc);
      } catch (error) {
        console.warn('Error generating image URL:', error);
        setImageSrc(src);
      }
    };

    generateSrc();
  }, [src, width, height, webp, supportsWebPFormat, quality, isVisible]);

  // Handle image load
  const handleLoad = (event) => {
    setIsLoaded(true);
    setIsError(false);
    onLoad?.(event);
  };

  // Handle image error
  const handleError = (event) => {
    setIsError(true);
    setIsLoaded(false);
    onError?.(event);
    
    // Try fallback to original src if WebP failed
    if (webp && supportsWebPFormat && src.includes('.webp')) {
      const fallbackSrc = src.replace('.webp', '.jpg');
      setImageSrc(generateImageUrl(fallbackSrc, { width, height, quality }));
    }
  };

  // Placeholder component
  const Placeholder = () => {
    if (placeholder === 'blur') {
      return (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      );
    }
    
    if (placeholder === 'empty') {
      return (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    return null;
  };

  // Error state
  if (isError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        style={{ width, height, ...style }}
        {...props}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height, ...style }}
      {...props}
    >
      {/* Placeholder */}
      {!isLoaded && <Placeholder />}
      
      {/* Actual image */}
      {isVisible && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      
      {/* Add shimmer animation styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Picture component for responsive images
export const Picture = memo(({
  src,
  alt,
  className = '',
  sources = [],
  width,
  height,
  quality = 80,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState('');

  const handleLoad = (event) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  const handleError = (event) => {
    onError?.(event);
  };

  return (
    <picture className={className}>
      {/* WebP sources */}
      {sources.map((source, index) => (
        <source
          key={`webp-${index}`}
          type="image/webp"
          srcSet={generateImageUrl(source.srcSet, { format: 'webp', quality })}
          media={source.media}
        />
      ))}
      
      {/* Original format sources */}
      {sources.map((source, index) => (
        <source
          key={`original-${index}`}
          srcSet={generateImageUrl(source.srcSet, { quality })}
          media={source.media}
        />
      ))}
      
      {/* Fallback image */}
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </picture>
  );
});

Picture.displayName = 'Picture';

// Avatar component with optimized loading
export const Avatar = memo(({
  src,
  alt,
  name,
  size = 40,
  className = '',
  ...props
}) => {
  const initials = name
    ? name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt || name}
          width={size}
          height={size}
          className="w-full h-full object-cover"
        />
      ) : (
        <span 
          className="text-gray-500 font-medium"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// Icon component with lazy loading
export const Icon = memo(({
  name,
  size = 24,
  className = '',
  ...props
}) => {
  const [iconSvg, setIconSvg] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const iconRef = useRef();
  
  const isVisible = useIntersectionObserver(iconRef, {
    threshold: 0.1,
    rootMargin: '50px',
  });

  useEffect(() => {
    if (!isVisible || !name) return;

    // Load icon SVG
    import(`./icons/${name}.svg`)
      .then(module => {
        setIconSvg(module.default);
        setIsLoaded(true);
      })
      .catch(error => {
        console.warn(`Failed to load icon: ${name}`, error);
      });
  }, [name, isVisible]);

  if (!isVisible) {
    return (
      <div 
        ref={iconRef}
        className={`bg-gray-100 rounded animate-pulse ${className}`}
        style={{ width: size, height: size }}
        {...props}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`bg-gray-100 rounded animate-pulse ${className}`}
        style={{ width: size, height: size }}
        {...props}
      />
    );
  }

  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: iconSvg }}
      {...props}
    />
  );
});

Icon.displayName = 'Icon';

export default OptimizedImage;
