import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import Web3 from "web3";
import { lotteryAbi } from "./ABIs/LotteryAbi.json";

const contractAddress = "0x3f108916137c33e88F41094943AbBE7757433b2a";

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      betRecords: [],
      winRecords: [],
      failRecords: [],
      pot: "0",
      challenges: ["0", "0"],
      finalRecords: [
        {
          bettor: "0xabcd...",
          index: "0",
          challenges: "ab",
          answer: "ab",
          targetBlockNumber: "10",
          pot: "0",
        },
      ],
    };
  }

  initApp = async () => {
    const web3Instance = await this.initWeb3();

    if (!web3Instance) return;

    console.log("start window.web3", this.web3);
    let accounts = await this.web3.eth.getAccounts();
    this.account = accounts[0];
    console.log("accounts:" + accounts);

    let balance = await this.web3.eth.getBalance(accounts[0]);
    console.log(balance);

    console.log(lotteryAbi);

    this.lotteryContract = new this.web3.eth.Contract(
      lotteryAbi,
      contractAddress
    );

    // call : 스마트컨트랙트에서 컨트랙트 상태를 변경시키지 않는 값만 가져오는 경우 사용
    // invoke, send : 스마트컨트랙트의 상태를 변화시킬 때 사용 하는 함수
    // const pot = await this.lotteryContract.methods.getPot().call();
    // const owner = await this.lotteryContract.methods.owner().call();
    // console.log(`pot money:${pot}, owner:${owner}`);

    // await this.getBetEvents();
  };

  getPot = async () => {
    const pot = await this.lotteryContract.methods.getPot().call();
    const potString = this.web3.utils.fromWei(pot.toString(), "ether");

    console.log(`getPot current PotMoney:${potString}`);
    this.setState({ pot: potString });
  };

  getWinEvents = async () => {
    const records = [];
    // fromBlock ~ toBlock (latest 사용 시 최신 블럭 정보로 가져옴)
    let events = await this.lotteryContract.getPastEvents("WIN", {
      fromBlock: 0,
      toBlock: "latest",
    });

    for (let i = 0; i < events.length; i++) {
      const record = {};
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.amount = parseInt(events[i].returnValues.amount, 10).toString();
      records.unshift(record);
    }

    // console.log("win events:", records);

    this.setState({ winRecords: records });
  };

  getFailEvents = async () => {
    const records = [];
    // fromBlock ~ toBlock (latest 사용 시 최신 블럭 정보로 가져옴)
    let events = await this.lotteryContract.getPastEvents("FAIL", {
      fromBlock: 0,
      toBlock: "latest",
    });

    for (let i = 0; i < events.length; i++) {
      const record = {};
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.answer = events[i].returnValues.answer;
      records.unshift(record);
    }

    // console.log("FAIL events:", records);

    this.setState({ failRecords: records });
  };

  // dapp에서의 데이터 관리
  // Read
  //    1. smart contract를 직접 call해와서 관리(event 보다는 느리다), batch read call
  //    2. event log를 읽어서 관리(indexed 를 추가해서 특정 값만 가져오는 것도 가능)
  //      1) http(polling)
  //      2) websocket(subscribe)
  // 1. init과 동시에 past event들을 가져온다.
  // 2. websocket으로 geth 또는 infura와 연결한다.
  // 3. websocket으로 원하는 이벤트를 subscribe 한다.
  //  - websocket를 이용할 수 없는 경우 polling 처리한다.(계속 물어보는 방법)
  // 4. 주의 할 점 : 돈이 걸려 있거나 하는 경우 => 블럭 컨펌횟수을 확인한다.
  // websocket에는 컨펌이 1회만 되어도 뱉어내기 때문에 믿을 수 없는 블럭일 수도 있다.
  // 이더리움에서는 일정 횟수의 컨펌(20 confirm이 아주 안전하다고 말해진다고 하는데.. 너무 느려질 듯) 이상인 경우 확정처리를 한다.

  // https://web3js.readthedocs.io/en/v1.3.0/web3-eth-contract.html#contract-events
  getBetEvents = async () => {
    const records = [];
    // fromBlock ~ toBlock (latest 사용 시 최신 블럭 정보로 가져옴)
    let events = await this.lotteryContract.getPastEvents("BET", {
      fromBlock: 0,
      toBlock: "latest",
    });

    for (let i = 0; i < events.length; i++) {
      const record = {};
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.bettor = events[i].returnValues.bettor;
      record.betBlockNumber = events[i].blockNumber;
      record.targetBlockNumber = events[
        i
      ].returnValues.answerBlockNumber.toString();
      record.challenges = events[i].returnValues.challenges;
      record.win = "Not Revealed";
      record.answer = "0x00";
      records.unshift(record);
    }

    // console.log("records:", records);
    this.setState({ betRecords: records });

    // var subscription = this.web3.eth
    //   .subscribe(
    //     "logs",
    //     {
    //       address: contractAddress,
    //       topics: ["BET"],
    //     },
    //     function (error, result) {
    //       if (!error) console.log(result);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("connected:", subscriptionId);
    //   })
    //   .on("data", function (log) {
    //     console.log("data:", log);
    //   })
    //   .on("changed", function (log) {
    //     console.log("changed:", log);
    //   });

    // const eventJsonInterface = this.web3.utils.find(
    //   lotteryAbi,
    //   (o) => o.name === "BET" && o.type === "event"
    // );

    // console.log("eventJsonInterface:" + eventJsonInterface);

    // console.log(
    //   "Topic sha3:" +
    //     this.web3.utils.sha3("BET(uint256,address,uint256,byte,uint256)")
    // );

    // var subscription2 = this.web3.eth
    //   .subscribe(
    //     "logs",
    //     {
    //       address: contractAddress,
    //       topics: [
    //         this.web3.utils.sha3("BET(uint256,address,uint256,byte,uint256)"),
    //       ],
    //     },
    //     function (error, result) {
    //       if (!error) console.log(result);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("connected22:", subscriptionId);
    //   })
    //   .on("data", function (log) {
    //     console.log("data22:", log);
    //   })
    //   .on("changed", function (log) {
    //     console.log("changed22:", log);
    //   });

    // unsubscribes the subscription
    // subscription.unsubscribe(function (error, success) {
    //   if (success) console.log("Successfully unsubscribed!");
    // });

    // this.lotteryContract.events
    //   .BET(
    //     {
    //       // filter: {
    //       //   myIndexedParam: [20, 23],
    //       //   myOtherIndexedParam: "0x123456789...",
    //       // },
    //       fromBlock: 0,
    //     },
    //     function (error, event) {
    //       if (error) {
    //         console.log("emitted BET event error=================", error);
    //       }
    //       console.log("emitted BET event=================", event);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("connected:", subscriptionId);
    //   })
    //   .on("data", function (event) {
    //     console.log("data:", event);
    //   })
    //   .on("changed", function (event) {
    //     // remove event from local database
    //     console.log("changed:", event);
    //   })
    //   .on("error", function (error, receipt) {
    //     // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    //     console.log("error:", error, ", receipt:", receipt);
    //   });

    // this.lotteryContract.events
    //   .DRAW(
    //     {
    //       // filter: {
    //       //   myIndexedParam: [20, 23],
    //       //   myOtherIndexedParam: "0x123456789...",
    //       // },
    //       fromBlock: 0,
    //     },
    //     function (error, event) {
    //       if (error) {
    //         console.log("emitted DRAW event error=================", error);
    //       }
    //       console.log("emitted DRAW event=================", event);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("DRAW connected:", subscriptionId);
    //   })
    //   .on("data", function (event) {
    //     console.log("DRAW data:", event);
    //   })
    //   .on("changed", function (event) {
    //     // remove event from local database
    //     console.log("DRAW changed:", event);
    //   })
    //   .on("error", function (error, receipt) {
    //     // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    //     console.log("DRAW error:", error, ", DRAW receipt:", receipt);
    //   });

    // this.lotteryContract.events
    //   .WIN(
    //     {
    //       // filter: {
    //       //   myIndexedParam: [20, 23],
    //       //   myOtherIndexedParam: "0x123456789...",
    //       // },
    //       fromBlock: 0,
    //     },
    //     function (error, event) {
    //       if (error) {
    //         console.log("emitted WIN event error=================", error);
    //       }
    //       console.log("emitted WIN event=================", event);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("WIN connected:", subscriptionId);
    //   })
    //   .on("data", function (event) {
    //     console.log("WIN data:", event);
    //   })
    //   .on("changed", function (event) {
    //     // remove event from local database
    //     console.log("WIN changed:", event);
    //   })
    //   .on("error", function (error, receipt) {
    //     // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    //     console.log("WIN error:", error, ", WIN receipt:", receipt);
    //   });

    // this.lotteryContract.events
    //   .FAIL(
    //     {
    //       // filter: {
    //       //   myIndexedParam: [20, 23],
    //       //   myOtherIndexedParam: "0x123456789...",
    //       // },
    //       fromBlock: 0,
    //     },
    //     function (error, event) {
    //       if (error) {
    //         console.log("emitted FAIL event error=================", error);
    //       }
    //       console.log("emitted FAIL event=================", event);
    //     }
    //   )
    //   .on("connected", function (subscriptionId) {
    //     console.log("FAIL connected:", subscriptionId);
    //   })
    //   .on("data", function (event) {
    //     console.log("FAIL data:", event);
    //   })
    //   .on("changed", function (event) {
    //     // remove event from local database
    //     console.log("FAIL changed:", event);
    //   })
    //   .on("error", function (error, receipt) {
    //     // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
    //     console.log("FAIL error:", error, ", FAIL receipt:", receipt);
    //   });
  };

  bet = async () => {
    let challenges =
      "0x" +
      this.state.challenges[0].toLowerCase() +
      this.state.challenges[1].toLowerCase();
    // nonce : 특정 Address가 그동안 몇개의 트랜잭션을 만들었는지에 대한 값
    // 트랜잭션 리플레이 방지
    // 트랜잭션을 실행시킬 때에는 논스를 실어서 보내야 한다.
    let nonce = await this.web3.eth.getTransactionCount(this.account);
    this.lotteryContract.methods
      .betAndDistribute(challenges)
      .send({
        from: this.account,
        value: 5 * 10 ** 15,
        gas: 300000,
        gasPrice: 10 * 10 ** 9,
        nonce: nonce,
      })
      .on("transactionHash", (hash) => {
        console.log("transactionHash:" + hash);
      });
  };

  initWeb3 = async () => {
    if (window.ethereum) {
      console.log("recent mode");
      this.web3 = new Web3(window.ethereum);
      window.ethereum.enable();
      return true;
    } else if (window.web3) {
      console.log("legacy mode");
      this.web3 = new Web3(Web3.currentProvider);
    }

    return false;
  };

  async componentDidMount() {
    await this.initApp();
    // await this.pollData();
    setInterval(this.pollData, 3000);
  }

  pollData = async () => {
    await this.getPot();
    await this.getBetEvents();
    await this.getWinEvents();
    await this.getFailEvents();
    this.makeFinalRecords();
  };

  makeFinalRecords = () => {
    let f = 0,
      w = 0;
    const records = [...this.state.betRecords];

    for (let i = 0; i < this.state.betRecords.length; i++) {
      if (
        this.state.winRecords.length > 0 &&
        this.state.betRecords[i].index === this.state.winRecords[w].index
      ) {
        records[i].win = "WIN";
        records[i].answer = records[i].challenges;
        records[i].pot = this.web3.utils.fromWei(
          this.state.winRecords[w].amount,
          "ether"
        );
        if (this.state.winRecords.length - 1 > w) w++;
      } else if (
        this.state.failRecords.length > 0 &&
        this.state.betRecords[i].index === this.state.failRecords[f].index
      ) {
        records[i].win = "FAIL";
        records[i].answer = this.state.failRecords[f].answer;
        records[i].pot = 0;
        if (this.state.failRecords.length - 1 > f) f++;
      } else {
        records[i].answer = "Not Revealed";
      }
    }

    this.setState({ finalRecords: records });
  };

  // Pot Money

  // bet 글자 선택 UI(버튼 형식)
  // Bet Button

  // History table
  // index address challenge answer  pot status answerBlockNumber blockhash 최신것부터 내림차순

  onClickCard = (_character) => {
    this.setState({
      challenges: [this.state.challenges[1], _character],
    });
  };

  getCard = (_character, _cardStyle) => {
    let _card = _character;
    if (_character === "A") {
      _card = "10";
    }
    if (_character === "B") {
      _card = "11";
    }
    if (_character === "C") {
      _card = "12";
    }
    if (_character === "D") {
      _card = "13";
    }
    if (_character === "E") {
      _card = "14";
    }
    if (_character === "F") {
      _card = "15";
    }
    return (
      <button
        className={_cardStyle}
        onClick={() => {
          this.onClickCard(_character);
        }}
      >
        <div className="card-body text-center">
          <p className="card-text"></p>
          <p className="card-text text-center" style={{ fontSize: 20 }}>
            {_card}
          </p>
          <p className="card-text"></p>
        </div>
      </button>
    );
  };

  render() {
    return (
      <div className="App">
        {/* Header - Pot, Betting characters */}
        <div className="container">
          <div className="jumbotron">
            <h1>Current Pot : {this.state.pot}</h1>
            <p>Lottery</p>
            <p>Lottery tutorial</p>
            <p>Your Bet</p>
            <p>
              {this.state.challenges[0]} {this.state.challenges[1]}
            </p>
          </div>
        </div>
        <div className="container">
          <div className="card-group">
            {this.getCard("0", "card bg-primary")}
            {this.getCard("1", "card bg-primary")}
            {this.getCard("2", "card bg-primary")}
            {this.getCard("3", "card bg-primary")}
            {this.getCard("4", "card bg-primary")}
            {this.getCard("5", "card bg-primary")}
            {this.getCard("6", "card bg-primary")}
            {this.getCard("7", "card bg-primary")}
            {this.getCard("8", "card bg-primary")}
            {this.getCard("9", "card bg-primary")}
            {this.getCard("A", "card bg-primary")}
            {this.getCard("B", "card bg-warning")}
            {this.getCard("C", "card bg-danger")}
            {this.getCard("D", "card bg-success")}
            {this.getCard("E", "card bg-success")}
            {this.getCard("F", "card bg-success")}
          </div>
        </div>
        <br></br>
        <div className="container">
          <button className="btn btn-danger btn-lg" onClick={this.bet}>
            BET!!
          </button>
        </div>
        <br></br>
        <div className="container">
          <table className="table table-dark table-striped">
            <thead>
              <tr>
                <th>Index</th>
                <th>Address</th>
                <th>Challenge</th>
                <th>Answer</th>
                <th>Pot</th>
                <th>Status</th>
                <th>AnswerBlockNumber</th>
              </tr>
            </thead>
            <tbody>
              {this.state.finalRecords.map((record, index) => {
                return (
                  <tr key={index}>
                    <td>{record.index}</td>
                    <td>{record.bettor}</td>
                    <td>{record.challenges}</td>
                    <td>{record.answer}</td>
                    <td>{record.pot}</td>
                    <td>{record.win}</td>
                    <td>{record.targetBlockNumber}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}

export default App;
