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
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import IconButton from '@material-ui/core/IconButton';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import SaveIcon from '@material-ui/icons/Save';
import ClearIcon from '@material-ui/icons/Clear';
import HelpIcon from '@material-ui/icons/Help';

import TextField from '@material-ui/core/TextField';

import CircularProgress from '@material-ui/core/CircularProgress';

import Popper from '@material-ui/core/Popper';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Fade from '@material-ui/core/Fade';
import Modal from '@material-ui/core/Modal';

import RootRef from '@material-ui/core/RootRef';

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

let foodDB;
let firebaseDoc;

const firebase = window.firebase;
const firestore = firebase.firestore();
firestore.settings({ timestampsInSnapshots: true });

const googleAuthProvider = new firebase.auth.GoogleAuthProvider();

const popperFadeMs = 350;

class App extends Component {
  state = {
    page: '/',
    foods: [],
    loadingFoods: true,
    bulkWeight: 0,
    cutWeight: 1,
    goal: 'cbulk',
    user: null,
    cbulkOpen: false,
    dbulkOpen: false,
    cutOpen: false,
    txtName: '',
    txtCalories: '',
    txtWeight: '',
    txtProtein: '',
    isSigninOpen: false,
    signinPromptOpen: false,
    isTransferOpen: false
  };

  constructor() {
    super();

    firebase.auth().onAuthStateChanged((user) => {
      this.setState({ user, loadingFoods: true }, () => {
        if (user) {
          firebaseDoc = firestore.collection('user_foods').doc(user.uid);
        }
        this.getFoods();
      });
    });

    this.state.noPromptChk = JSON.parse(localStorage.getItem('noPromptChk'));
  }

  componentWillMount() {
    this.setState({ page: window.location.pathname });
    this.props.history.listen((e) => {
      this.setState({ page: e.pathname });
    });
  }

  arrayToDoc(array, keyProp) {
    let doc = {};
    array.forEach((el, i) => doc[el[keyProp] || i] = el);
    return doc;
  }

  getFoods = () => {
    if (this.state.user) {
      firebaseDoc.get().then((doc) => {
        if (doc.exists) {
          let foods = [];
          let foodsDoc = doc.data();
          for (const food in foodsDoc) {
            foods.push(foodsDoc[food]);
          }
          this.setState({ foods, loadingFoods: false });
        }
      });
    }
    else {
      let request = indexedDB.open("FoodRank", 1);

      request.onsuccess = (e) => {
        foodDB = e.target.result;

        let trans = foodDB.transaction("food", "readonly");
        trans.objectStore("food").getAll().onsuccess = (e) => {
          this.setState({ foods: e.target.result, loadingFoods: false },);
        }
      };

      request.onupgradeneeded = (e) => {
        let db = e.target.result;

        if (db.objectStoreNames.contains("food")) {
          db.deleteObjectStore("food");
        }
        db.createObjectStore("food", { keyPath: "name" });
      };
    }
  }

  shouldShowSigninPrompt = () => !this.state.user && !this.state.supressPrompt && !this.state.noPromptChk;

  addFood = () => {
    let updatedFood = { name:     this.state.txtName,
                        calories: Number(this.state.txtCalories) || 0,
                        weight:   Number(this.state.txtWeight)   || 0,
                        protein:  Number(this.state.txtProtein)  || 0 }

    if (this.state.user) {
      firebaseDoc.set({ [updatedFood.name]: updatedFood }, { merge: true })
        .then(() => {
          this.setState({ txtName: '', txtCalories: '', txtWeight: '', txtProtein: '' })
          this.getFoods();
        });
    }
    else {
      let trans = foodDB.transaction("food", "readwrite");
      let store = trans.objectStore("food");
      store.put(updatedFood);
      let signinPromptOpen = this.shouldShowSigninPrompt();
      this.setState({ txtName: '', txtCalories: '', txtWeight: '', txtProtein: '', signinPromptOpen });
      if (signinPromptOpen) {
        this.btnSignin.focus();
      }
      this.getFoods();
    }
  }

  deleteFood = (foodName) => {
    if (this.state.user) {
      firebaseDoc.update({ [foodName]: firebase.firestore.FieldValue.delete() })
        .then(() => {
          this.getFoods();
        });
    }
    else {
      let trans = foodDB.transaction("food", "readwrite");
      let store = trans.objectStore("food");
      store.delete(foodName);
      let signinPromptOpen = this.shouldShowSigninPrompt();
      if (signinPromptOpen) {
        this.setState({ signinPromptOpen });
        this.btnSignin.focus();
      }
      this.getFoods();
    }
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
    this.setState({ [e.target.name]: e.target.value });
  }

  editFood = (food) => {
    this.setState({ txtName: food.name, txtCalories: food.calories, txtWeight: food.weight, txtProtein: food.protein });
    this.calInput.focus();
  }

  clearInputs = () => {
    this.setState({ txtName: '', txtCalories: '', txtWeight: '', txtProtein: '' });
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
      if (this.state.user) {
        let foodDoc = this.arrayToDoc(defaults, 'name');
        firebaseDoc.set(foodDoc, { merge: true })
          .then(() => this.getFoods());
      }
      else {
        let trans = foodDB.transaction("food", "readwrite");
        let store = trans.objectStore("food");
        defaults.forEach((food) => {
          store.put(food);
        });
        let signinPromptOpen = this.shouldShowSigninPrompt();
        if (signinPromptOpen) {
          this.setState({ signinPromptOpen });
          this.btnSignin.focus();
        }
        this.getFoods();
      }
    });
  }

  signIn = () => {
    firebase.auth().signInWithPopup(googleAuthProvider)
      .then((user) => {
        this.setState({ isSigninOpen: false,
                        isTransferOpen: !!this.state.foods.length,
                        localFoods: this.state.foods }); // Preserve prior/local state of foods for transfer
      });
  }

  signinClicked = () => {
    if (!this.state.user) {
      this.setState({ isSigninOpen: true });
    }
    else {
      firebase.auth().signOut();
    }
  }

  noPromptChkChange = (e) => {
    let noPromptChk = e.target.checked;
    this.setState({ noPromptChk });
    localStorage.setItem('noPromptChk', noPromptChk);
  }

  clearLocalStore = () => {
    let trans = foodDB.transaction("food", "readwrite");
    let store = trans.objectStore("food");
    store.clear();
  }

  transferFoods = () => {
    let foodDoc = this.arrayToDoc(this.state.localFoods, 'name');
    firebaseDoc.set(foodDoc, { merge: true })
      .then(() => {
        this.clearLocalStore();
        this.setState({ isTransferOpen: false, loadingFoods: true });
        this.getFoods();
      });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <Button className="btn-signin"
                  variant="contained" color="primary"
                  buttonRef={(btnSignin) => this.btnSignin = btnSignin}
                  onClick={this.signinClicked}>{`Sign ${!this.state.user ? 'in' : 'out'}`}</Button>
          <Popper
            open={this.state.signinPromptOpen}
            anchorEl={this.btnSignin}
            placement="bottom-end"
          >
            <ClickAwayListener onClickAway={() => this.setState({ signinPromptOpen: false, supressPrompt: true })}>
              <Fade in={this.state.signinPromptOpen} timeout={popperFadeMs}>
                <Paper className="popover">
                  <p>Sign in to sync your foods across devices.</p>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={this.state.noPromptChk}
                        onChange={this.noPromptChkChange}
                        color="primary"
                      />
                    }
                    label="Don't show this again"
                  />
                </Paper>
              </Fade>
            </ClickAwayListener>
          </Popper>
          <Modal
            className="modal-container"
            open={this.state.isSigninOpen}
            onClose={() => this.setState({ isSigninOpen: false })}
          >
            <Paper className="modal">
              <img src="/images/signin_google.png" onClick={this.signIn}/>
            </Paper>
          </Modal>
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">{'{ FoodRank }'}</h1>
        </header>
        <nav>
          <Tabs value={this.state.page}
                onChange={(e, i) => this.setState({ page: i })}
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
                          let index = !food.calories ? Infinity :
                                      this.state.goal === 'cbulk'  ? food.protein / food.calories * 100 :
                                      this.state.goal === 'dbulk' ? food.protein / food.weight * 100 :
                                                                    food.weight / food.calories * 100;
                          return { name: food.name, index }
                        })
                        .sort((a, b) => b.index - a.index)
                        .map(food =>
                          <TableRow key={food.name}>
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
                value={this.state.goal}
              >
                <FormControlLabel
                  value="cbulk"
                  control={<Radio color="primary"/>}
                  label="Clean bulk"
                />
                <RootRef rootRef={(cbulkHelp) => this.cbulkHelp = cbulkHelp}>
                  <IconButton onClick={() => this.setState({ cbulkOpen: true })} >
                    <HelpIcon />
                  </IconButton>
                </RootRef>
                <Popper
                  open={this.state.cbulkOpen}
                  anchorEl={this.cbulkHelp}
                  placement="right-start"
                >
                  <ClickAwayListener onClickAway={() => this.setState({ cbulkOpen: false })}>
                    <Fade in={this.state.cbulkOpen} timeout={popperFadeMs}>
                      <Paper className="popover">
                        <p>Ranked by a ratio of <b>protein/calories</b>.</p>
                      </Paper>
                    </Fade>
                  </ClickAwayListener>
                </Popper>
                <FormControlLabel
                  value="dbulk"
                  control={<Radio color="primary"/>}
                  label="Dirty bulk"
                />
                <RootRef rootRef={(dbulkHelp) => this.dbulkHelp = dbulkHelp}>
                  <IconButton onClick={() => this.setState({ dbulkOpen: true })} >
                    <HelpIcon />
                  </IconButton>
                </RootRef>
                <Popper
                  open={this.state.dbulkOpen}
                  anchorEl={this.dbulkHelp}
                  placement="right-start"
                >
                  <ClickAwayListener onClickAway={() => this.setState({ dbulkOpen: false })}>
                    <Fade in={this.state.dbulkOpen} timeout={popperFadeMs}>
                      <Paper className="popover">
                        <p>Ranked by a ratio of <b>protein/weight</b>.</p>
                      </Paper>
                    </Fade>
                  </ClickAwayListener>
                </Popper>
                <FormControlLabel
                  value="cut"
                  control={<Radio color="primary"/>}
                  label="Cut"
                />
                <RootRef rootRef={(cutHelp) => this.cutHelp = cutHelp}>
                  <IconButton onClick={() => this.setState({ cutOpen: true })} >
                    <HelpIcon />
                  </IconButton>
                </RootRef>
                <Popper
                  open={this.state.cutOpen}
                  anchorEl={this.cutHelp}
                  placement="right-start"
                >
                  <ClickAwayListener onClickAway={() => this.setState({ cutOpen: false })}>
                    <Fade in={this.state.cutOpen} timeout={popperFadeMs}>
                      <Paper className="popover">
                        <p>Ranked by a ratio of <b>weight/calories</b>.</p>
                      </Paper>
                    </Fade>
                  </ClickAwayListener>
                </Popper>
              </RadioGroup>
            </React.Fragment>
          } />
          <Route path="/foods" render={() =>
            <React.Fragment>
              <div className="foods-container">
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
                  <Paper className="table table--foods">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Calories</TableCell>
                          <TableCell>Weight (g)</TableCell>
                          <TableCell>Protein (g)</TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {
                          this.state.foods.map(food =>
                            <TableRow key={food.name}>
                              <TableCell>{food.name}</TableCell>
                              <TableCell>{food.calories}</TableCell>
                              <TableCell>{food.weight}</TableCell>
                              <TableCell>{food.protein}</TableCell>
                              <TableCell>
                                <IconButton onClick={() => this.editFood(food)} title="Edit">
                                  <EditIcon />
                                </IconButton>
                                <IconButton onClick={() => this.deleteFood(food.name)} title="Delete">
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          )
                        }
                      </TableBody>
                    </Table>
                  </Paper>
                }
              </div>
              <Paper className="table table--add-edit">
                <div>
                  <label className="cell head" >Name</label>
                  <label className="cell">
                    <TextField value={this.state.txtName} onInput={this.updateVal} name="txtName"
                               inputRef={(nameInput) => this.nameInput = nameInput} />
                  </label>
                </div>
                <div>
                  <span className="cell head">Calories</span>
                  <div className="cell">
                    <TextField type="number" value={this.state.txtCalories} onInput={this.updateVal} name="txtCalories"
                               inputRef={(calInput) => this.calInput = calInput} />
                  </div>
                </div>
                <div>
                  <span className="cell head">Weight (g)</span>
                  <div className="cell">
                    <TextField type="number" value={this.state.txtWeight} onInput={this.updateVal} name="txtWeight" />
                  </div>
                </div>
                <div>
                  <span className="cell head">Protein (g)</span>
                  <div className="cell">
                    <TextField type="number" value={this.state.txtProtein} onInput={this.updateVal} name="txtProtein" />
                  </div>
                </div>
                <div>
                  <span className="cell head" />
                  <span className="cell action">
                    <IconButton onClick={this.addFood} title="Add/Update">
                      <SaveIcon />
                    </IconButton>
                    <IconButton onClick={this.clearInputs} title="Clear fields">
                      <ClearIcon />
                    </IconButton>
                  </span>
                </div>
              </Paper>
            </React.Fragment>
          } />
          <Modal
            className="modal-container"
            open={this.state.isTransferOpen}
            onClose={() => this.setState({ isTransferOpen: false })}
          >
            <Paper className="modal">
              <div>
                <div>You have some foods saved locally. Would you like them transferred to your account?</div><br/>
                <Button variant="contained" color="primary" onClick={this.transferFoods}>Let's do it</Button>
                <Button variant="contained" color="primary" onClick={() => this.setState({ isTransferOpen: false })}>No thanks</Button>
              </div>
            </Paper>
          </Modal>
        </main>
      </div>
    );
  }
}

export default withRouter(App);
