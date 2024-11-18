const ResponseSuggestions = ({ message, onSelectSuggestion }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      const generateSuggestions = async () => {
        setLoading(true);
        try {
          const response = await axios.post('/ai/suggestions', {
            messageContent: message.content,
            priority: message.priority,
            context: {
              sender: message.senderName,
              timestamp: message.timestamp
            }
          });
          setSuggestions(response.data.suggestions);
        } catch (error) {
          console.error('Error generating suggestions:', error);
        } finally {
          setLoading(false);
        }
      };
  
      if (message) {
        generateSuggestions();
      }
    }, [message]);
  
    if (loading) {
      return (
        <div className="flex items-center justify-center p-2">
          <div className="animate-spin h-4 w-4 border-t-2 border-primary"></div>
        </div>
      );
    }
  
    return (
      <div className="flex gap-2 overflow-x-auto p-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelectSuggestion(suggestion)}
            className="px-3 py-1 text-sm bg-dark-lighter rounded-full hover:bg-primary hover:text-white transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  };