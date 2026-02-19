import React, { useState, useEffect } from 'react';

function DarkModeToggle() {
  const [dark, setDark] = useState(false);
  
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  
  return (
    <button onClick={() => setDark(!dark)}>
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

export default DarkModeToggle;