import React, { InputHTMLAttributes } from 'react';

const Input: React.FC<InputHTMLAttributes<HTMLInputElement>> = ({ type = 'text', placeholder, ...props }) => {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="px-4 py-2 border rounded w-full"
      {...props}
    />
  );
};

export default Input;