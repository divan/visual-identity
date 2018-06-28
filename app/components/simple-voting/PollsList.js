import React, { Fragment, Component } from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Slider from '@material-ui/lab/Slider';
import Tooltip from '@material-ui/core/Tooltip';
import PollManager from 'Embark/contracts/PollManager';
import MiniMeTokenInterface from 'Embark/contracts/MiniMeTokenInterface';
import web3 from "Embark/web3"

class Poll extends Component {

  constructor(props){
    super(props);
    this.state = { value: 0, balance: 0, isSubmitting: false, ...props };
  }

  handleChange = (event, value) => {
    this.setState({ value });
  };

  handleClick = (event) => {
    event.preventDefault();

    this.setState({isSubmitting: true});

    const { customVote, poll, unvote } = PollManager.methods;
    const { idPoll, value } = this.state;
    const { toWei } = web3.utils;

    const balance4Voting = toWei(value * value);
    const toSend = balance4Voting == 0 ? unvote(idPoll) : customVote(idPoll, balance4Voting);
    
    toSend.estimateGas()
      .then(gasEstimated => {
        console.log("voting gas estimated: " + gasEstimated);
        return toSend.send({gas: gasEstimated + 100000});
      })
      .then(res => {
        console.log('sucess:', res);
        this.setState({isSubmitting: false});
        return poll(idPoll).call();
      })
      .then(poll => {
        this.setState(poll);
      })
      .catch(res => {
        console.log('fail:', res);
      })
      .finally(() => {
        this.setState({isSubmitting: false});
      });
  }

  componentDidMount() {
    const { fromWei } = web3.utils;
    MiniMeTokenInterface.options.address = this.props._token;
    MiniMeTokenInterface.methods.balanceOfAt(web3.eth.defaultAccount, this.props._startBlock - 1)
                                .call()
                                .then(balance => {
                                  this.setState({balance: fromWei(balance)});
                                });

    PollManager.methods.getVote(this.props.idPoll, web3.eth.defaultAccount)
                       .call()
                       .then(vote => {
                         this.setState({value: parseInt(Math.sqrt(fromWei(vote)))});
                       })
  }

  render(){
    const { _description,
            _totalCensus,
            _voters,
            _qvResults,
            _results, 
            _canVote, 
            value, 
            isSubmitting,
            balance,
            votes } = this.state;

    const disableVote = balance == 0 || !_canVote || isSubmitting;
    const { fromWei } = web3.utils;
    const maxValue = Math.floor(Math.sqrt(balance));

    return (
      <Card>
        <CardContent>
          <Typography variant="headline">{_description}</Typography>
          <Typography variant="subheading" color="textSecondary">
            Number of voters: {_voters}
          </Typography>
          <Typography variant="subheading" color="textSecondary">
            Votes: {_qvResults}
          </Typography>
          <Typography variant="subheading" color="textSecondary">
            SNT Allocated: {fromWei(_results)}
          </Typography>
        </CardContent>
        <Tooltip id="tooltip-icon" placement="top" title={`${value * value} SNT - ${value} vote credits`}>
        <CardActions>
            <Slider disabled={disableVote} value={value} min={0} max={maxValue} step={1} onChange={this.handleChange} />
            <Button variant="contained" disabled={disableVote}  color="primary" onClick={this.handleClick}>Vote</Button>
        </CardActions>
          </Tooltip>
      </Card>
    )
  }
}


const PollsList = ({ rawPolls  }) => (
  <Fragment>
    {rawPolls.map((poll, idx) => <Poll key={idx} idPoll={idx} {...poll} />)}
  </Fragment>
)

export default PollsList
