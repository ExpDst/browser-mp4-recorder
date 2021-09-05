import './style';
import { Recorder, init } from './Recorder';
import { useEffect, useState, useRef } from 'react';


export default function App() {
	const [recorderLoaded, setRecorderLoaded] = useState(false);
	const [ isRecording, setIsRecording ] = useState(false);
	useEffect(() => {
		init('assets', () => {
			setRecorderLoaded(true);
		});
	}, []);
	return (
		<div>
			{
				!recorderLoaded ? 
				<h1>Loading....</h1> :
				<div>
					<button onClick={async () => { 
						if(!isRecording) {
							await Recorder.startRecording();
							setIsRecording(true);
						} else if(isRecording) {
							await Recorder.stopRecording();
							setIsRecording(false);
						}
					}}>{!isRecording ? "Start Recording" : "Stop Recording"}</button>
				</div>
			}
		</div>
	);
}
