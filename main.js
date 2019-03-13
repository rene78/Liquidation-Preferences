/*
--Some assumptions/simplifications--
Return: 1× participation preference, except founder
One shareholder = one share class
Static check whether to convert to common shares or not
*/

let ownership = [];
let totalNumberOfShares = 0;
let totalInvestedSum = 0;
const exitPrices = [17.4e6, 20e6, 25e6, 35e6, 39e6, 40e6, 45e6, 47e6, 50e6, 60e6, 70e6]; //Exit prices for select field
let exitPrice = 60e6;
let sumToBeDistributed = 0;
let newSumToBeDistributed;
let cappedPercentage;

fillOutSelect();
checkPayout(); //On load calculate exit prices for 17.4e6

function fillOutSelect() {
  let selectOptions = "";
  for (let i = 0; i < exitPrices.length; i++) {
    selectOptions += "<option value=" + exitPrices[i] + ">" + exitPrices[i]/1e6 + "</option>";
  }
  // console.log(selectOptions);
  document.getElementById("exit-value-select").innerHTML = selectOptions;
}

//First check if exit value <= totalInvestedSum and trigger appropriate function
function checkPayout() {
  ownership = [
    { class: "Common", nShares: 1e6, investedSum: 0, percentage: undefined, cap: undefined, preferred: false, capped: false, payout: undefined },
    { class: "A", nShares: 0.2e6, investedSum: 0.9e6, percentage: undefined, cap: 2, preferred: true, capped: false, payout: undefined },
    { class: "B", nShares: 0.3e6, investedSum: 2.1e6, percentage: undefined, cap: 2, preferred: true, capped: false, payout: undefined },
    { class: "C", nShares: 1.5e6, investedSum: 15e6, percentage: undefined, cap: 2, preferred: true, capped: false, payout: undefined }
  ];

  totalNumberOfShares = ownership.reduce((acc, investor) => acc + investor.nShares, 0);
  totalInvestedSum = ownership.reduce((acc, investor) => acc + investor.investedSum, 0);

  let selectedIndex = document.getElementById("exit-value-select").selectedIndex;
  console.log(selectedIndex);
  exitPrice = exitPrices[selectedIndex];
  sumToBeDistributed = exitPrice - totalInvestedSum;
  console.log(sumToBeDistributed);
  newSumToBeDistributed = sumToBeDistributed;
  if (sumToBeDistributed <= 0) cascadePayout();
  else estimatePayout();
}

//Exit value is below investedsum: Cascade sumToBeDistributed to investors starting from series C
function cascadePayout() {
  console.log("Cascade " + exitPrice / 1e6 + " Mio");
  let leftover = exitPrice;
  for (let i = ownership.length - 1; i >= 0; i--) {
    if (leftover > ownership[i].investedSum) {
      leftover -= ownership[i].investedSum;
      ownership[i].payout = ownership[i].investedSum;
      console.log(ownership[i].class + " receives " + ownership[i].payout / 1e6 + "Mio $");
    } else {
      ownership[i].payout = leftover;
      console.log(ownership[i].class + " receives " + leftover);
      leftover = 0;
    }
  }
  fillOutHtmlTable();
}

/*Exit value is above investedsum: Calculate expected payout for each investor and check what conversion to common would mean
Calculate for each investor:
- Percentage of ownership. Add value to object
- Cap value
- Estimated payout
Check for each investor:
- Is cap exceeded?
- If yes: - Convert to commons? Update boolean "preferred"
          - Add/subtract from total payout
*/
function estimatePayout() {
  console.log("Distribute " + sumToBeDistributed / 1e6 + " Mio");
  cappedPercentage = 0;
  for (let i = 0; i < ownership.length; i++) {

    ownership[i].percentage = ownership[i].nShares / totalNumberOfShares;
    console.log(i + ": Percentage: " + ownership[i].percentage * 100 + "%");

    //Calculate cap value for each investor
    let capValue = ownership[i].investedSum * ownership[i].cap;
    console.log(i + ": Cap is " + capValue / 1e6 + " Mio");

    //Calculate estimated payout
    let payoutEstimated = ownership[i].investedSum + (ownership[i].percentage * sumToBeDistributed);
    console.log(i + ": Estimated payout (pref) is " + payoutEstimated / 1e6 + " Mio");

    //Check if estimated payout for preferred shares is higher than cap
    if (payoutEstimated > capValue) {
      console.log(i + ": Estimated payout is HIGHER than cap value!");
      console.log(i + ": Payout for preferred: " + capValue / 1e6 + " Mio");
      console.log(i + ": Payout for commons (assump.: only this one converts): " + sumToBeDistributed * ownership[i].percentage / 1e6 + " Mio");
      if (capValue > sumToBeDistributed * ownership[i].percentage) {
        console.log(i + ": It's best to keep preferred shares!");
        newSumToBeDistributed -= ownership[i].investedSum; //Subtract invested sum from sumToBeDistributed
        ownership[i].capped = true; //Distribute percentage among non-capped investors pro-rata
        cappedPercentage += ownership[i].percentage;
      } else {
        console.log(i + ": It's best to convert to common shares!");
        newSumToBeDistributed += ownership[i].investedSum; //Add invested sum to sumToBeDistributed
        ownership[i].preferred = false;
      }
    }
    else {
      console.log(i + ": Return is LOWER than cap value!");
    }
  }
  console.log("Capped percentage: " + cappedPercentage);
  console.log("New sumToBeDistributed: " + newSumToBeDistributed / 1e6 + " Mio");
  calculatePayout();
}

/*calculatePayout
- If applicable: Calculate new percentage for all "uncapped" shareholders
- Calculate payout
*/
function calculatePayout() {
  for (let i = 0; i < ownership.length; i++) {
    if (ownership[i].capped == false && ownership[i].preferred === true) {
      ownership[i].percentage /= 1 - cappedPercentage;
      console.log(i + ": New percentage is " + ownership[i].percentage);
      ownership[i].payout = ownership[i].investedSum + (ownership[i].percentage * newSumToBeDistributed);
    } else if (ownership[i].capped == false && ownership[i].preferred === false) {
      ownership[i].percentage /= 1 - cappedPercentage;
      console.log(i + ": New percentage is " + ownership[i].percentage);
      ownership[i].payout = ownership[i].percentage * newSumToBeDistributed;
    } else {
      ownership[i].percentage = 0;
      console.log(i + ": New percentage is " + ownership[i].percentage);
      ownership[i].payout = ownership[i].investedSum * ownership[i].cap;
    }
  }
  console.log(ownership);
  fillOutHtmlTable();
}

function fillOutHtmlTable() {

  let shareClass = document.querySelectorAll(".share-class");
  let nShares = document.querySelectorAll(".n-shares");
  let investedSum = document.querySelectorAll(".invested-sum");
  let payout = document.querySelectorAll(".payout");
  let overallPayout = 0;
  for (let i = 0; i < shareClass.length; i++) {
    shareClass[i].innerText = ownership[i].class;
    nShares[i].innerText = ownership[i].nShares / 1e6;
    investedSum[i].innerText = ownership[i].investedSum / 1e6;
    payout[i].innerText = reduceDecimals(ownership[i].payout);
    payout[i].className="payout";//remove all classes from payout

    //Change background color, if capped
    if (ownership[i].capped) {
      payout[i].classList.add("capped");
    }
    //Change background color, if Commons
    if (ownership[i].preferred == false) {
      payout[i].classList.add("common");
    }
    overallPayout += ownership[i].payout;
  }
  let totalNShares = document.querySelector(".total-n-shares");
  totalNShares.innerText = totalNumberOfShares / 1e6;

  let totalInvested = document.querySelector(".total-invested-sum");
  totalInvested.innerText = totalInvestedSum / 1e6;

  let totalPayout = document.querySelector(".total-payout");
  totalPayout.innerText = overallPayout / 1e6;
}

function reduceDecimals(value) {
  value /= 1e6;
  if (Math.floor(value) === value) {
    return value;
  }
  else if (value.toString().split(".")[1].length > 3) {
    return value.toFixed(2);
  }
  return value;
}