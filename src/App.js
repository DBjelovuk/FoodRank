import React, { Component } from 'react';
import { Route, Link, withRouter } from 'react-router-dom';
import logo from './logo.svg';
import './styles/App.css';

import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Button from '@material-ui/core/Button';

import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Slider from '@material-ui/lab/Slider';

import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import SaveIcon from '@material-ui/icons/Save';
import ClearIcon from '@material-ui/icons/Clear';

import TextField from '@material-ui/core/TextField';

import CircularProgress from '@material-ui/core/CircularProgress';

const defaults = [
  { name: 'Pure Protein bar', calories: 200,  protein: 20, weight: 50 },
  { name: 'Egg whites',       calories: 120,  protein: 28, weight: 252 },
  { name: 'Ground beef',      calories: 765,  protein: 95, weight: 450 },
  { name: 'Snack Pack jello', calories: 5,    protein: 0,  weight: 99 },
  { name: 'Potatoes',         calories: 297,  protein: 8,  weight: 400 },
  { name: 'White rice',       calories: 365,  protein: 7,  weight: 100 },
  { name: 'Ground turkey',    calories: 590,  protein: 82, weight: 454 },
  { name: 'Pepperoni pizza',  calories: 1290, protein: 50, weight: 537 },
  { name: 'Breyers Delights', calories: 280,  protein: 16, weight: 286 },
  { name: 'Broccoli',         calories: 34,   protein: 2.8, weight: 100 }
];

class App extends Component {

  state = {
    page: '/',
    foods: [],
    loadingFoods: true,
    bulkWeight: 0,
    cutWeight: 1,
    goal: 'cut'
  };

  foodDB;

  constructor() {
    super();

    var request = indexedDB.open("FoodRank", 1);

    request.onsuccess = (e) => {
      this.foodDB = e.target.result;
      this.getFoods();
    };

    request.onupgradeneeded = (e) => {
      var db = e.target.result;

      if (db.objectStoreNames.contains("food")) {
        db.deleteObjectStore("food");
      }
      db.createObjectStore("food", {keyPath: "name"});
    };
  }

  componentWillMount() {
    this.setState({ page: window.location.pathname });
    this.props.history.listen((e) => {
      this.setState({ page: e.pathname });
    });
  }

  getFoods = () => {
    let trans = this.foodDB.transaction("food", "readonly");
    trans.objectStore("food").getAll().onsuccess = (e) => {
      this.setState({ ...this.state, foods: e.target.result, loadingFoods: false },);
    }
  }

  addFood = () => {
    let trans = this.foodDB.transaction("food", "readwrite");
    let store = trans.objectStore("food");
    let state = this.state;
    store.put({ name: state.txtName,
                calories: Number(state.txtCalories) || 0, weight: Number(state.txtWeight) || 0, protein: Number(state.txtProtein) || 0 });
    this.setState({ ...state, txtName: '', txtCalories: '', txtWeight: '', txtProtein: '' });
    this.getFoods();
  }

  deleteFood = (foodName) => {
    let trans = this.foodDB.transaction("food", "readwrite");
    let store = trans.objectStore("food");
    store.delete(foodName);
    this.getFoods();
  }

  changeGoal = (e) => {
    let goal = e.target.value;
    if (goal === 'bulk') {
      this.setState({ bulkWeight: 1, cutWeight: 0, goal });
    }
    else if (goal === 'cut') {
      this.setState({ bulkWeight: 0, cutWeight: 1, goal });
    }
    else {
      this.setState({ bulkWeight: .33, cutWeight: .67, goal });
    }
  }

  sliderChanged = (e, value) => {
    let cutWeight = parseFloat(value / 100);
    this.setState({ bulkWeight: 1 - cutWeight, cutWeight });
  }

  updateVal = (e) => {
    this.setState({...this.state, [e.target.name]: e.target.value });
  }

  editFood = (food) => {
    this.setState({ ...this.state, txtName: food.name, txtCalories: food.calories, txtWeight: food.weight, txtProtein: food.protein });
    this.calInput.focus();
  }

  clearInputs = () => {
    this.setState({ ...this.state, txtName: '', txtCalories: '', txtWeight: '', txtProtein: '' });
  }

  focusName = () => {
    this.nameInput.focus();
  }

  componentDidUpdate = () => {
    if (this.state.focusName) {
      this.focusName();
      this.setState({ focusName: false });
    }
  }

  loadExamples = () => {
    this.setState({ loadingFoods: true }, () => {
      let trans = this.foodDB.transaction("food", "readwrite");
      let store = trans.objectStore("food");
      defaults.forEach((food) => {
        store.put(food);
      });
      this.getFoods();
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">{'{ FoodRank }'}</h1>
        </header>
        <nav>
          <Tabs value={this.state.page}
                onChange={(e,i) => this.setState({ page: i })}
                centered={true}>
            <Tab label="Ranking" component={Link} to="/" value="/" />
            <Tab label="Foods" component={Link} to="/foods" value="/foods" />
          </Tabs>
        </nav>
        <main>
          <Route path="/" exact render={() =>
            <React.Fragment>
              {
                this.state.loadingFoods &&
                <div className="spinner-container">
                  <CircularProgress/>
                </div>
              }
              {
                !this.state.loadingFoods && !this.state.foods.length &&
                <div className="no-foods">
                  <div>No foods yet...</div>
                  <Button variant="outlined" component={Link} to="/foods"
                          onClick={() => this.setState({ focusName: true })}>Add some</Button>
                </div>
              }
              {
                !this.state.loadingFoods && !!this.state.foods.length &&
                // <div className="table table--index">
                //   <label className="cell head">Food</label>
                //   <span className="cell head">Index</span>
                //   <div className="break"></div>
                //   {
                //     this.state.foods.map(food => {
                //       let index = food.calories ? (food.protein / food.calories * 100 * this.state.bulkWeight) +
                //                                   (food.weight / food.calories * 100 * this.state.cutWeight)
                //                                 : Infinity;
                //       return { name: food.name, index }
                //     })
                //     .sort((a, b) => b.index - a.index)
                //     .map(food =>
                //       <React.Fragment>
                //         <label className="cell">{food.name}&nbsp;</label>
                //         <span className="cell">{Math.round(food.index)}</span>
                //         <div className="break"></div>
                //       </React.Fragment>
                //     )
                //   }
                // </div>
                <Paper className="table table--index">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Food</TableCell>
                        <TableCell>Index</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {
                        this.state.foods.map(food => {
                          let index = food.calories ? (food.protein / food.calories * 100 * this.state.bulkWeight) +
                                                      (food.weight / food.calories * 100 * this.state.cutWeight)
                                                    : Infinity;
                          return { name: food.name, index }
                        })
                        .sort((a, b) => b.index - a.index)
                        .map(food =>
                          <TableRow>
                            <TableCell>{food.name}</TableCell>
                            <TableCell>{Math.round(food.index)}</TableCell>
                          </TableRow>
                        )
                      }
                    </TableBody>
                  </Table>
                </Paper>
              }
              <RadioGroup
                name="goal"
                className="radio-group"
                row={true}
                onChange={this.changeGoal}
                onClick={this.changeGoal}
                value={this.state.goal}
              >
                <FormControlLabel
                  value="bulk"
                  control={<Radio color="primary"/>}
                  label="Bulk (protein density)"
                />
                <FormControlLabel
                  value="cut"
                  control={<Radio color="primary"/>}
                  label="Cut (satiety)"
                />
                <FormControlLabel
                  value="hybrid"
                  control={<Radio color="primary"/>}
                  label="Hybrid (1:2 weighting)"
                />
              </RadioGroup>
              <br/>
              <Slider className="slider" min={0} max={100} onChange={this.sliderChanged} value={this.state.cutWeight * 100} />
              <div className="weights">
                <span>{Math.round(this.state.bulkWeight * 100)}</span>
                <span>{Math.round(this.state.cutWeight * 100)}</span>
              </div>
            </React.Fragment>
          } />
          <Route path="/foods" render={() =>
            <React.Fragment>
              {
                this.state.loadingFoods &&
                <div className="spinner-container">
                  <CircularProgress/>
                </div>
              }
              {
                !this.state.loadingFoods && !this.state.foods.length &&
                <div className="no-foods">
                  <div>No foods yet...</div>
                  <Button variant="outlined" onClick={this.loadExamples} >Load some examples</Button>
                </div>
              }
              {
                !this.state.loadingFoods && !!this.state.foods.length &&
                <div className="table table--foods">
                  <label className="cell head" >Name</label>
                  <span className="cell head">Calories</span>
                  <span className="cell head">Weight (g)</span>
                  <span className="cell head">Protein (g)</span>
                  <span className="cell action"></span>
                  <div className="break"/>
                  {
                    this.state.foods.map(food =>
                      <React.Fragment>
                        <label className="cell">{food.name}</label>
                        <span className="cell">{food.calories}</span>
                        <span className="cell">{food.weight}</span>
                        <span className="cell">{food.protein}</span>
                        <span className="cell action">
                          <IconButton onClick={() => this.editFood(food)} title="Edit">
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => this.deleteFood(food.name)} title="Delete">
                            <DeleteIcon />
                          </IconButton>
                        </span>
                        <div className="break"></div>
                      </React.Fragment>
                    )
                  }
                </div>
              }
              <div className="table table--add-edit">
                <label className="cell head" >Name</label>
                <span className="cell head">Calories</span>
                <span className="cell head">Weight (g)</span>
                <span className="cell head">Protein (g)</span>
                <span className="cell action"></span>
                <div className="break"></div>
                <label className="cell">
                  <TextField value={this.state.txtName} onInput={this.updateVal} name="txtName"
                              inputRef={(nameInput) => this.nameInput = nameInput} />
                </label>
                <div className="cell">
                  <TextField type="number" value={this.state.txtCalories} onInput={this.updateVal} name="txtCalories"
                             inputRef={(calInput) => this.calInput = calInput} />
                </div>
                <div className="cell">
                  <TextField type="number" value={this.state.txtWeight} onInput={this.updateVal} name="txtWeight" />
                </div>
                <div className="cell">
                  <TextField type="number" value={this.state.txtProtein} onInput={this.updateVal} name="txtProtein" />
                </div>
                <span className="cell action">
                  <IconButton onClick={this.addFood} title="Add/Update">
                    <SaveIcon />
                  </IconButton>
                  <IconButton onClick={this.clearInputs} title="Clear fields">
                    <ClearIcon />
                  </IconButton>
                </span>
              </div>
            </React.Fragment>
          } />
        </main>
      </div>
    );
  }
}

export default withRouter(App);
