import React from 'react';
import createFragment from 'react-addons-create-fragment';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import Quill from 'quill';
import ReactQuill from 'react-quill';
import DeltaConverter from 'quill-delta-to-html';
// import * as d3 from 'd3';
// import * as topojson from 'topojson';


// import planetaryjs from './planetaryjs.min.js'
import List from './components/List.jsx';
import Chapter from './components/Chapter.jsx';
import Editor from './components/Editor.jsx';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      cities: [],
      coordinates: [],
      mode: 'globe',
      title: '',
      isHovering: false,
      votes: 0,
      geolocation: [],
      content: { __html: '<p>There was a story.<span style="color:#003700;background-color:#cce8cc"> And this is the next part.</span></p>'},
      id: undefined
    }
    this.quillRef = null;
    this.geocoder = undefined;
    this.oldContent = {};
    this.planet = undefined;
    this.geocoder = undefined;
    this.canvas = undefined;
    this.loadPlugin = this.loadPlugin.bind(this);
    this.loadCities = this.loadCities.bind(this);
    this.setPing = this.setPing.bind(this);
    this.loadChapter = this.loadChapter.bind(this);
    this.loadQR = this.loadQR.bind(this)
    this.click = this.click.bind(this);
    this.upVote = this.upVote.bind(this);
    this.downVote = this.downVote.bind(this);
    this.reveal = this.reveal.bind(this);
    this.hide = this.hide.bind(this);
    this.updateVotes = this.updateVotes.bind(this);
    this.drawGlobe = this.drawGlobe.bind(this);
  }

  componentDidMount() {
    // document.querySelector('video').playbackRate = .3;
    this.drawGlobe();
  }

  drawGlobe() {
    this.planet = planetaryjs.planet();
    this.geocoder =  new google.maps.Geocoder();
    this.loadPlugin();
    this.loadCities();
    this.canvas = document.getElementById('globe');
  }

  loadCities() {
    $.ajax({
      url: '/cities',
      success: (data) => {
        var cities = data.map(obj => obj.title);
        var coordinates = data.map(obj => JSON.parse(obj.geolocation))
        this.setState({
          cities: cities
        })
        this.setState({coordinates: coordinates}, () => {
          this.state.coordinates.forEach(coordinate => {
            if(coordinate) {
              this.setPing(coordinate[1], coordinate[0]);
            }
          });
        });
        this.planet.draw(this.canvas);
      },
      error: (err) => {
        console.log('err', err);
      }
    });
  }

  loadPlugin() {
    this.planet.loadPlugin(planetaryjs.plugins.earth({
      topojson: { file: './world-110m.json' },
      oceans:   { fill:  '#dbd9da'},
      land:     { fill: '#afacad'},
      borders:  { stroke: '#afacad'}
    }));
    this.planet.loadPlugin(planetaryjs.plugins.pings({color: 'yellow', ttl: 5000, angle: 10}));
    this.planet.loadPlugin(planetaryjs.plugins.drag());
  }

  setPing(lng, lat) {
    setInterval(() => {this.planet.plugins.pings.add(lng, lat, {color: 'white', ttl: 2000, angle: Math.random() * 8}, 250)}, (Math.random() * 2000) + 1000)
  }

  loadChapter() {
    $.ajax({
      url: `/items/${this.state.title}`,
      success: (data) => {
        this.setState({
          geolocation: JSON.parse(data[0].geolocation),
          content: {__html: data[0].content},
          id: data[0].id,
          votes: data[0].votes
        })
      },
      error: (err) => {
        console.log('err', err);
      }
    });
  }

  loadQR(qr) {
    this.quillRef = qr;
    this.oldContent = this.quillRef.getContents();
  }

  save() {
    var newContent = this.quillRef.getContents()
    var diff = this.oldContent.diff(newContent)
    for (var i = 0; i < diff.ops.length; i++) {
      var op = diff.ops[i];
      if (op.hasOwnProperty('insert')) {
        op.attributes = {
          background: "#dbd9da",
          color: "#003700"
        };
      }
    }
    var adjusted = this.oldContent.compose(diff);
    var converter = new DeltaConverter(adjusted.ops, {});
    var html = converter.convert();
    this.setState({votes: 0}, () =>{
      fetch('/items', {
        method: 'POST',
        body: JSON.stringify({
          title: this.state.title,
          geolocation: JSON.stringify(this.state.geolocation),
          content: html,
          votes: this.state.votes,
        }),
        headers: {
          'content-type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(jsonRes => this.setState({mode: 'globe'}))
      .then(jsonRes => this.drawGlobe())
      .catch(err => console.log(err));
    })
    this.setState({content: {__html: html}})
  }


reveal() {
  this.setState({isHovering: !this.state.isHovering})
}

hide() {
  setTimeout(() => this.setState({isHovering: !this.state.isHovering}), 1000)
}

upVote() {
  if(this.state.votes === 10) {
    let noSpan = this.state.content.__html.replace(/<span[^>]*>|<\/span>/g, '');
    this.setState({votes: ++this.state.votes},() => {
      this.setState({content: { __html: noSpan}}, () => {
        this.updateVotes();
      })
    });
    fetch('/perm', {
      method: 'POST',
      body: JSON.stringify({
        id: this.state.id,
        title: this.state.title,
        content: noSpan,
        votes: this.state.votes,
        geolocation: JSON.stringify(this.state.geolocation)
      }),
      headers: {
        'content-type': 'application/json'
      }
    })
    .then(res => res.json())
    .catch(err => console.log(err));
  } else {
    this.setState({votes: ++this.state.votes},() => {
      this.updateVotes();
    });
  }
}

downVote() {
  this.setState({votes: --this.state.votes}, () => {
    this.updateVotes();
    this.setState({mode: 'globe'}, this.drawGlobe);
  });
}

updateVotes() {
  fetch('/votes', {
    method: 'PUT',
    body: JSON.stringify({
      title: this.state.title,
      content: this.state.content.__html,
      votes: this.state.votes,
      geolocation: JSON.stringify(this.state.geolocation)
    }),
    headers: {
      'content-type': 'application/json'
    }
  })
  .then(res => res.json())
  .catch(err => console.log(err));

}

  click() {
    switch (this.state.mode) {
      case 'globe':
        let city = this.cityInput.value;
        this.setState({title: city});
        this.state.cities.includes(city) ? this.setState({mode: 'chapter'}) :
        this.geocoder.geocode({'address': city}, (results, status) => {
          if (status == google.maps.GeocoderStatus.OK) {
            let geolocation = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
            this.setState({geolocation: geolocation});
            this.setState({mode: 'newEditor'});
          }
        });
        break;
      case 'chapter':
        this.setState({mode: 'editor'});
        break;
      case 'editor':
        this.save();
        break;
      case 'newEditor':
        this.save();
        break;
      default:
      console.log('mode not recognized')
    }
  }

  render () {
    let button;
    switch (this.state.mode) {
      case 'globe':
        button = 'init';
        break;
      case 'chapter':
        button = 'fork';
        break;
      case 'editor':
        button = 'pull request';
        break;
      case 'newEditor':
        button = 'pull request';
        break;
      default:
      console.log('mode not recognized')
    }
    let mode;
    switch (this.state.mode) {
      case 'globe':
        mode =
          <div>
            <video autoPlay muted loop id="starsVideo">
              <source src="video.mp4" type="video/mp4" />
            </video>
            <div id="goto">
              <h2 className="title" id="homeTitle">Git Saga</h2>
              <input ref={el => this.cityInput = el} id="cityInput" name="data" type="radio" list="data" type="text" placeholder="city, country" />
                <datalist className="dropdown" ref="dList" id="data" >
                {this.state.cities.map((city, i) => <option className="dropdown" key={i} value={city} />)}
                </datalist>
              <button className="main" id="initButton" onClick={this.click}>{button}</button>
            </div>
            {this.state.cities.map((city, i) => <option className="dropdown" key={i} value={city} />)}
            <canvas onClick={this.takeLocation} id='globe' width='750' height='750'></canvas>
          </div>;
        break;
      case 'chapter':
        mode = <Chapter mode={this.state.mode} title={this.state.title} upVote={this.upVote} downVote={this.downVote} votes={this.state.votes} reveal={this.reveal} hide={this.hide} isHovering={this.state.isHovering} content={this.state.content} edit={this.edit} loadQR={this.loadQR} loadChapter={this.loadChapter} button={button} click={this.click}/>;
        break;
      case 'editor':
        mode = <Chapter mode={this.state.mode} title={this.state.title} upVote={this.upVote} downVote={this.downVote} votes={this.state.votes} reveal={this.reveal} hide={this.hide} isHovering={this.state.isHovering} content={this.state.content} edit={this.edit} loadQR={this.loadQR} button={button} click={this.click}/>;
        break;
      case 'newEditor':
        mode = <Editor className="editor" title={this.state.title} loadQR={this.loadQR} button={button} click={this.click} />;
        break;
      default:
      console.log('mode not recognized')
    }
    return (<div id="globe-container">
      {mode}
    </div>)
  }
}

ReactDOM.render(<App />, document.getElementById('app'));