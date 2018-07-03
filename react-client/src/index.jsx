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
      content: { __html: '<p>There was a story.<span style="color:#003700;background-color:#cce8cc"> And this is the next part.</span></p>'}
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
    this.drawGlobe();

  }

  componentDidUpdate() {
console.log('this.state.mode: ', this.state.mode)
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
      oceans:   { fill:  '#497287'},
      land:     { fill: '#000000'},
      borders:  { stroke: '#de8048'}
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
    console.log('save is being called')
  var newContent = this.quillRef.getContents()
  var diff = this.oldContent.diff(newContent)
  for (var i = 0; i < diff.ops.length; i++) {
      var op = diff.ops[i];
      if (op.hasOwnProperty('insert')) {
        op.attributes = {
          background: "#cce8cc",
          color: "#003700"
        };
      }
    }
    var adjusted = this.oldContent.compose(diff);
    var converter = new DeltaConverter(adjusted.ops, {});
    var html = converter.convert();
    console.log('html: ', html)
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
      .then(jsonRes => console.log('jsonRes: ', jsonRes))
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
  if(this.state.votes > 10) {
    let xmlString = this.state.content.__html;
    let parser = new DOMParser();
    let doc = parser.parseFromString(xmlString, "text/xml");
    var childContent = doc.childNodes[0].textContent;
    this.setState({votes: ++this.state.votes},() => {
      this.setState({content: { __html: `<p>${childContent}</p>`}}, () => {
        this.updateVotes();
      })
    });

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
  .then(jsonRes => console.log('jsonRes: ', jsonRes))
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
            <h2 className="title">Git Saga</h2>
            <input ref={el => this.cityInput = el} className="cityInput" name="data" type="radio" list="data" type="text" placeholder="city, country" />
            <datalist className="dropdown" ref="dList" id="data" >
            {this.state.cities.map((city, i) => <option className="dropdown" key={i} value={city} />)}
            </datalist>
            <canvas onClick={this.takeLocation} id='globe' width='750' height='750'></canvas>
          </div>;
        break;
      case 'chapter':
        mode = <Chapter mode={this.state.mode} title={this.state.title} upVote={this.upVote} downVote={this.downVote} votes={this.state.votes} reveal={this.reveal} hide={this.hide} isHovering={this.state.isHovering} content={this.state.content} edit={this.edit} loadQR={this.loadQR} loadChapter={this.loadChapter} button={button}/>;
        break;
      case 'editor':
        mode = <Chapter mode={this.state.mode} title={this.state.title} upVote={this.upVote} downVote={this.downVote} votes={this.state.votes} reveal={this.reveal} hide={this.hide} isHovering={this.state.isHovering} content={this.state.content} edit={this.edit} loadQR={this.loadQR} button={button}/>;
        break;
      case 'newEditor':
        mode = <Editor className="editor" title={this.state.title} loadQR={this.loadQR} />;
        break;
      default:
      console.log('mode not recognized')
    }
    return (<div>
      {mode}
      <button className="main" onClick={this.click}>{button}</button>
    </div>)
  }
}

ReactDOM.render(<App />, document.getElementById('app'));