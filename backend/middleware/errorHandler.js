export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle Matrix SDK specific errors
    if (err.errcode) {
      return res.status(400).json({
        error: err.message || 'Matrix error occurred',
        code: err.errcode
      });
    }
    
    // Handle general errors
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message;
  
    res.status(statusCode).json({
      error: message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };