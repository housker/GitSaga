import React from 'react';
import ReactQuill from 'react-quill';
import $ from 'jquery';
import ReactDOM from 'react-dom';
import Quill from 'quill';
import Delta from 'quill-delta';

class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modules: {clipboard: {matchVisual: false}}
    }
    this.quillRef = null;
    this.reactQuillRef = null;
  }

  componentDidMount() {
    if(this.quillRef === null && typeof this.reactQuillRef.getEditor === 'function') {
      this.quillRef = this.reactQuillRef.getEditor();
      this.props.loadQR(this.quillRef)
    }
  }

  render() {
    return (
      <div>
      <h2 id="title" onMouseEnter={this.props.reveal} onMouseLeave={this.props.hide}>{this.props.title}</h2>
      <ReactQuill className="editor" placeholder={"A new chapter begins . . ."} className="content" ref={(el) => { this.reactQuillRef = el }} modules={this.state.modules} theme="bubble" />
      <button className="main" id="forkButton" onClick={this.props.click}>{this.props.button}</button>
      </div>
    )
  }
}

export default Editor;