import React from 'react';

const PageHeader = ({ title, breadcrumbs, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        {breadcrumbs && (
          <nav className="text-sm text-gray-400">
             {breadcrumbs.map((crumb, index) => (
               <span key={index}>
                 {index > 0 && <span className="mx-2">/</span>}
                 {crumb.href ? (
                   <a href={crumb.href} className="hover:text-blue-400 transition-colors">{crumb.label}</a>
                 ) : (
                   <span>{crumb.label}</span>
                 )}
               </span>
             ))}
          </nav>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
