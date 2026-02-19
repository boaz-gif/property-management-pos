import React, { lazy, Suspense } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy loaded heavy components
export const LazyPropertyImageUpload = lazy(() => 
  import('./PropertyImageUpload').then(module => ({
    default: module.default
  }))
);

export const LazyDocumentUpload = lazy(() => 
  import('./DocumentUpload').then(module => ({
    default: module.default
  }))
);

export const LazyDocumentList = lazy(() => 
  import('./DocumentList').then(module => ({
    default: module.default
  }))
);

export const LazyVirtualTenantList = lazy(() => 
  import('./VirtualTenantList').then(module => ({
    default: module.default
  }))
);

export const LazyVirtualPropertyList = lazy(() => 
  import('./VirtualPropertyList').then(module => ({
    default: module.default
  }))
);

// Chart components (typically heavy)
export const LazyDashboardChart = lazy(() => 
  import('./charts/DashboardChart').then(module => ({
    default: module.default
  }))
);

export const LazyFinancialChart = lazy(() => 
  import('./charts/FinancialChart').then(module => ({
    default: module.default
  }))
);

// Report components
export const LazyTenantReport = lazy(() => 
  import('./reports/TenantReport').then(module => ({
    default: module.default
  }))
);

export const LazyPropertyReport = lazy(() => 
  import('./reports/PropertyReport').then(module => ({
    default: module.default
  }))
);

// Modal components
export const LazyTenantModal = lazy(() => 
  import('./modals/TenantModal').then(module => ({
    default: module.default
  }))
);

export const LazyPropertyModal = lazy(() => 
  import('./modals/PropertyModal').then(module => ({
    default: module.default
  }))
);

// Form components
export const LazyTenantForm = lazy(() => 
  import('./forms/TenantForm').then(module => ({
    default: module.default
  }))
);

export const LazyPropertyForm = lazy(() => 
  import('./forms/PropertyForm').then(module => ({
    default: module.default
  }))
);

// Wrapper component for lazy loading with consistent loading state
export const LazyWrapper = ({ children, fallback = null }) => {
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

// Higher-order component for lazy loading
export const withLazyLoading = (Component, fallback = null) => {
  return (props) => (
    <LazyWrapper fallback={fallback}>
      <Component {...props} />
    </LazyWrapper>
  );
};

// Preloading utilities
export const preloadComponent = (componentLoader) => {
  // Preload component for better UX
  const timer = setTimeout(() => {
    componentLoader();
  }, 1000); // Start preloading after 1 second

  return () => clearTimeout(timer);
};

// Preload critical components
export const preloadCriticalComponents = () => {
  const cleanupFunctions = [];

  // Preload components based on user role or route
  cleanupFunctions.push(
    preloadComponent(() => import('./PropertyImageUpload'))
  );
  cleanupFunctions.push(
    preloadComponent(() => import('./VirtualTenantList'))
  );
  cleanupFunctions.push(
    preloadComponent(() => import('./VirtualPropertyList'))
  );

  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
};

// Intersection Observer for lazy loading components in viewport
export const useIntersectionObserver = (ref, options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref?.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
};

// Component that lazy loads when visible
export const LazyOnVisible = ({ children, fallback, ...props }) => {
  const ref = React.useRef();
  const isVisible = useIntersectionObserver(ref);

  return (
    <div ref={ref} {...props}>
      {isVisible ? (
        <LazyWrapper fallback={fallback}>
          {children}
        </LazyWrapper>
      ) : (
        fallback || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
          </div>
        )
      )}
    </div>
  );
};

export default {
  LazyPropertyImageUpload,
  LazyDocumentUpload,
  LazyDocumentList,
  LazyVirtualTenantList,
  LazyVirtualPropertyList,
  LazyDashboardChart,
  LazyFinancialChart,
  LazyTenantReport,
  LazyPropertyReport,
  LazyTenantModal,
  LazyPropertyModal,
  LazyTenantForm,
  LazyPropertyForm,
  LazyWrapper,
  withLazyLoading,
  preloadComponent,
  preloadCriticalComponents,
  useIntersectionObserver,
  LazyOnVisible
};
