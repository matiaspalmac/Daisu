import React, { TextareaHTMLAttributes } from 'react';

const Textarea: React.FC<TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ placeholder, ...props }) => {
  return (
    <textarea
      placeholder={placeholder}
      className="px-4 py-2 border rounded w-full"
      {...props}
    />
  );
};

export default Textarea;