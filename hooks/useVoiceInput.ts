
import { useState, useEffect, useCallback, useRef } from 'react';

export const useVoiceInput = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);
    const isStartingRef = useRef(false);

    useEffect(() => {
        let rec: any = null;

        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onstart = () => {
                setIsListening(true);
                isStartingRef.current = false;
            };
            
            rec.onend = () => {
                setIsListening(false);
                isStartingRef.current = false;
            };
            
            rec.onerror = (event: any) => {
                // Ignore 'no-speech' errors as they just mean silence
                if (event.error !== 'no-speech') {
                    setError(event.error);
                }
                setIsListening(false);
                isStartingRef.current = false;
            };

            rec.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setTranscript(final || interim);
            };

            setRecognition(rec);
        } else {
            setError('Speech recognition not supported in this browser.');
        }

        return () => {
            if (rec) {
                // Prevent event handlers from firing after unmount
                rec.onstart = null;
                rec.onend = null;
                rec.onerror = null;
                rec.onresult = null;
                try {
                    rec.stop();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognition && !isListening && !isStartingRef.current) {
            try {
                isStartingRef.current = true;
                recognition.start();
                setError(null);
            } catch (e: any) {
                // If it's already started, we can safely ignore
                if (e.message && e.message.includes('already started')) {
                     setIsListening(true);
                } else {
                     console.error("Voice start error:", e);
                }
                isStartingRef.current = false;
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (e) {
                console.warn("Voice stop error:", e);
            }
        }
    }, [recognition, isListening]);

    const resetTranscript = () => setTranscript('');

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        error,
        isSupported: !!recognition
    };
};
