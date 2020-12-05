import React, {useEffect, useRef, useState, useCallback} from 'react';
import {
  HashRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";


import styled from 'styled-components';

import jimp from 'jimp';

const { desktopCapturer, ipcRenderer } = require('electron')

//
// class App extends PureComponent {
//   constructor (props) {
//     super(props)
//
//     this.state = {
//       width: 100,
//       height: 100,
//       top: 100,
//       left: 100,
//       rotateAngle: 0
//     }
//   }
//
//   handleResize = ({ top, left, width, height }, isShiftKey, type) => {
//     this.setState({
//       top: Math.round(top),
//       left: Math.round(left),
//       width: Math.round(width),
//       height: Math.round(height)
//     })
//   }
//
//   handleRotate = (rotateAngle) => {
//     this.setState({ rotateAngle })
//   }
//
//   handleDrag = (deltaX, deltaY) => {
//     this.setState({
//       left: this.state.left + deltaX,
//       top: this.state.top + deltaY
//     })
//   }
//
//   handleRotateEnd = () => console.log('RotateEnd')
//
//   handleRotateStart = () => console.log('RotateStart')
//
//   render () {
//     const { top, left, width, height, rotateAngle } = this.state
//     return <ResizableRect {...{
//       top,
//       left,
//       width,
//       height,
//       rotateAngle,
//       // aspectRatio: false,
//       minWidth: -Infinity,
//       minHeight: -Infinity,
//       zoomable: 'n, w, s, e, nw, ne, se, sw',
//       // rotatable: true,
//       onRotateStart: this.handleRotateStart,
//       onRotate: this.handleRotate,
//       onRotateEnd: this.handleRotateEnd,
//       // onResizeStart: this.handleResizeStart,
//       onResize: this.handleResize,
//       // onResizeEnd: this.handleUp,
//       // onDragStart: this.handleDragStart,
//       onDrag: this.handleDrag
//       // onDragEnd: this.handleDragEnd,
//     }} />
//   }
// }

const Magnifier = styled.div.attrs(({x, y}) => ({
  style: {
    transform: `translate(${x - 150}px, ${y - 150}px)`,
    overflow: 'hidden'
  }
}))`
  width: 300px;
  height: 300px;
  border: solid white 1px;
  position: absolute;
  border-radius: 50%;
`;

function Home() {
  const [mousePos, setMousePos] = useState({x:-1, y:-1});
  const [imgSrc, setImgSrc] = useState(null);

  function handleMouseMove(e) {
    const {clientY, clientX} = e;
    setMousePos({x: clientX, y: clientY});
  }

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    ipcRenderer.on('updated-canvas', (event, data) => {
      console.log(data)
      setImgSrc(data.canvas)
    })
  }, []);
  return (
  <div>
    <Magnifier x={mousePos.x} y={mousePos.y}>
      <img src={imgSrc} />
    </Magnifier>
  </div>
  );
}

function App() {
  return (
    <Router>
      <div>
        <Switch>
          <Route path="/video">
            <VideoCapture />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </div>
      </Router>
  )
}
function VideoCapture() {
  const video = useRef(null);
  const sources = useRef([]);
  const currentSourceId = useRef(-1);

  function handleMouseMove(e) {
    const {clientY, clientX} = e;

    //change source if change screen
    if (clientX < 3 || clientY < 3 || clientX > 19999 || clientY > 19999) {
      desktopCapturer.getSources({ types: ['screen'] }).then(srcs => {
        ipcRenderer.send('get-mouse-position', {})
        sources.current = srcs;
      })
    }

    //takeSnapshot();
    handleStream(video.current, {x: clientX, y: clientY});
  }

  const handleStream = useCallback((stream, mousePos) => {
    // Create hidden video tag
    const video = document.createElement('video');
    video.style.cssText = 'position:absolute;top:-10000px;left:-10000px;';
    // Event connected to stream
    video.onloadedmetadata = function () {
      // Set video ORIGINAL height (screenshot)
      video.style.height = this.videoHeight + 'px'; // videoHeight
      video.style.width = this.videoWidth + 'px'; // videoWidth

      video.play();

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 300// this.videoWidth;
      canvas.height = 300//this.videoHeight;
      canvas.style = {...canvas.style,
        position: 'absolute',
        left: '-10000px',
        top: '-10000px'
      };
      const ctx = canvas.getContext('2d');
      // Draw video on canvas
      //ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, mousePos.x - 150, mousePos.y - 150, 300, 300, 0, 0, 300, 300);

      ipcRenderer.send('update-canvas', {canvas: canvas.toDataURL('image/png')})
      // Remove hidden video tag
      video.remove();

      try {
        //Destroy connect to stream
        //stream.getTracks()[0].stop();
      } catch (e) {}
    }

    video.srcObject = stream;

    document.body.appendChild(video);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);

    ipcRenderer.on('get-mouse-position-complete', async (event, {distScreen, cursor}) => {
      for (const source of sources.current) {
        if (source.display_id === String(distScreen.id)) {
          if (currentSourceId.current === source.display_id) return ;
          currentSourceId.current = source.display_id;
          try {
            video.current /*.srcObject */ = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id,
                  minWidth: distScreen.workAreaSize.width,
                  maxWidth: distScreen.workAreaSize.width,
                  minHeight: distScreen.workAreaSize.height,
                  maxHeight: distScreen.workAreaSize.height
                }
              }
            });
          } catch (e) {
            console.log(e)
          }
          return
        }
      }
    })
    desktopCapturer.getSources({ types: ['screen'] }).then(srcs => {
      ipcRenderer.send('get-mouse-position', {})
      sources.current = srcs;
    })
  }, []);

  return (
    <div>
      {/*<video style={{visibility: 'hidden'}} ref={video} autoPlay={true} />*/}
    </div>
  );
}
export default App;//hot(module)(App);
