package speechsdk.quickstart;

import com.microsoft.cognitiveservices.speech.audio.AudioConfig;
import com.microsoft.cognitiveservices.speech.audio.PullAudioOutputStream;
import com.microsoft.cognitiveservices.speech.dialog.BotConnectorConfig;
import com.microsoft.cognitiveservices.speech.dialog.SpeechBotConnector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.SourceDataLine;
// import java.io.InputStream;

public final class App {
    final static Logger log = LoggerFactory.getLogger(App.class);

    public static void main(String[] args) {
        final String channelSecret = "8GoCpzQAFHA.cwA.ErM.mmDOajssRrJ-xHdgZrUX0ocDnHvb1-rLRiwdmByoe1w";
        final String subscriptionKey = "a7a87906a4c846afb629c3f978906606";
        final String region = "westus2";
        final BotConnectorConfig botConnectorConfig = BotConnectorConfig.fromSecretKey(channelSecret, subscriptionKey,
                region);

        // Configure audio input from microphone.
        final AudioConfig audioConfig = AudioConfig.fromDefaultMicrophoneInput();

        // Create a SpeechjBotConnector instance
        final SpeechBotConnector botConnector = new SpeechBotConnector(botConnectorConfig, audioConfig);

        // Recognizing will provide the intermediate recognized text while an audio
        // stream is being processed
        botConnector.recognizing.addEventListener((o, speechRecognitionResultEventArgs) -> {
            log.info("Recognizing speech event text: {}", speechRecognitionResultEventArgs.getResult().getText());
        });

        // Recognized will provide the final recognized text once audio capture is
        // completed
        botConnector.recognized.addEventListener((o, speechRecognitionResultEventArgs) -> {
            log.info("Recognized speech event reason text: {}", speechRecognitionResultEventArgs.getResult().getText());
        });

        // SessionStarted will notify when audio begins flowing to the service for a
        // turn
        botConnector.sessionStarted.addEventListener((o, sessionEventArgs) -> {
            log.info("Session Started event id: {} ", sessionEventArgs.getSessionId());
        });

        // SessionStopped will notify when a turn is complete and it's safe to begin
        // listening again
        botConnector.sessionStopped.addEventListener((o, sessionEventArgs) -> {
            log.info("Session stopped event id: {}", sessionEventArgs.getSessionId());
        });

        // Canceled will be signaled when a turn is aborted or experiences an error
        // condition
        botConnector.canceled.addEventListener((o, canceledEventArgs) -> {
            log.info("Canceled event details: {}", canceledEventArgs.getErrorDetails());
            botConnector.disconnectAsync();
        });

        // ActivityReceived is the main way your bot will communicate with the client
        // and uses bot framework activities.
        botConnector.activityReceived.addEventListener((o, activityEventArgs) -> {
            // final String act = activityEventArgs.getActivity().serialize();
            log.info("Received activity {} audio", activityEventArgs.hasAudio() ? "with" : "without");
            if (activityEventArgs.hasAudio()) {
                playAudioStream(activityEventArgs.getAudio());
            }
        });

        botConnector.connectAsync();
        // Start listening.
        System.out.println("Say something ...");
        botConnector.listenOnceAsync();

        // botConnector.sendActivityAsync(...)
    }

    private static void playAudioStream(PullAudioOutputStream audio) {
        ActivityAudioStream stream = new ActivityAudioStream(audio);
        final ActivityAudioStream.ActivityAudioFormat audioFormat = stream.getActivityAudioFormat();
        final AudioFormat format = new AudioFormat(AudioFormat.Encoding.PCM_SIGNED, audioFormat.getSamplesPerSecond(),
                audioFormat.getBitsPerSample(), audioFormat.getChannels(), audioFormat.getFrameSize(),
                audioFormat.getSamplesPerSecond(), false);
        try {
            int bufferSize = format.getFrameSize();
            final byte[] data = new byte[bufferSize];

            SourceDataLine.Info info = new DataLine.Info(SourceDataLine.class, format);
            SourceDataLine line = (SourceDataLine) AudioSystem.getLine(info);
            line.open(format);

            if (line != null) {
                line.start();
                int nBytesRead = 0;
                while (nBytesRead != -1) {
                    nBytesRead = stream.read(data);
                    if (nBytesRead != -1) {
                        line.write(data, 0, nBytesRead);
                    }
                }
                line.drain();
                line.stop();
                line.close();
            }
            stream.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
