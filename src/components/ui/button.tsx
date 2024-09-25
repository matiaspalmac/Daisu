import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'outline' | 'solid';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, type = 'button', variant = 'solid', className = '' }) => {
  const baseClasses = 'px-4 py-2 rounded';
  const variantClasses = variant === 'outline' ? 'border' : 'bg-blue-500 text-white';
  const combinedClasses = `${baseClasses} ${variantClasses} ${className}`;

  return (
    <button type={type} onClick={onClick} className={combinedClasses}>
      {children}
    </button>
  );
};

export default Button;