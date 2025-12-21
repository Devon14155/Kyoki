
import { useState, useEffect, useCallback } from 'react';

export const useVoiceInput = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            // @ts-ignore
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onstart = () => setIsListening(true);
            rec.onend = () => setIsListening(false);
            rec.onerror = (event: any) => {
                setError(event.error);
                setIsListening(false);
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
    }, []);

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            try {
                recognition.start();
                setError(null);
            } catch (e) {
                console.error(e);
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
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
