// =====================================
// METALBUILD GARAGE SYSTEM
// =====================================



// =====================================
// 보유 파츠 목록
// =====================================


let ownedParts = [];




// 시작 지급 파츠 추가

function loadStarterParts(){


    ownedParts.push(

        starterParts.shield,

        starterParts.launcher,

        starterParts.body,

        starterParts.leg

    );


}






// =====================================
// 커스터마이징 화면
// =====================================


const customScreenElement =

document.getElementById(
    "custom-screen"
);





// =====================================
// 슬롯 이름
// =====================================


const slotNames = {


    leftArm:"왼팔",

    rightArm:"오른팔",

    back1:"등 1",

    back2:"등 2",

    body:"몸통",

    leftLeg:"왼쪽 다리",

    rightLeg:"오른쪽 다리"


};







// =====================================
// 커스터마이징 UI 생성
// =====================================


function renderGarage(){



    const partsArea =

    document.getElementById(
        "parts"
    );



    partsArea.innerHTML = "";





    // 현재 장착 슬롯 표시


    Object.keys(slotNames)

    .forEach(slot=>{


        let button =

        document.createElement(
            "button"
        );



        let equipped =

        playerRobot.parts[slot];



        button.innerHTML = `

        ${slotNames[slot]}

        <br>

        ${
            equipped ?

            equipped.name :

            "비어있음"

        }

        `;



        button.onclick = ()=>{


            showAvailableParts(slot);


        };



        partsArea.appendChild(button);



    });



}








// =====================================
// 장착 가능한 파츠 보여주기
// =====================================


function showAvailableParts(slot){



    let list =

    ownedParts.filter(

        part=>

        part.slot === slot

    );



    if(list.length===0){


        alert(
            "장착 가능한 파츠가 없습니다."
        );


        return;


    }






    let message =

    "장착할 파츠 선택\n\n";




    list.forEach(

        (part,index)=>{


            message +=

            `${index+1}. ${part.name}\n`;


        }


    );





    let select =

    prompt(message);





    let index =

    Number(select)-1;





    if(

        list[index]

    ){



        equipGaragePart(

            list[index]

        );


    }



}







// =====================================
// 파츠 장착
// =====================================


function equipGaragePart(part){



    equipPart(part);



    alert(

        part.name +

        " 장착 완료!"

    );



    renderGarage();


}







// =====================================
// 파츠 획득
// 전투/뽑기에서 사용
// =====================================


function addPart(part){



    ownedParts.push(part);



    alert(

        "새로운 파츠 획득!\n"

        +

        part.name

    );



}







// =====================================
// 보유 파츠 확인
// =====================================


function showOwnedParts(){


    console.log(
        ownedParts
    );


}







// =====================================
// 초기 실행
// =====================================


loadStarterParts();


console.log(
    "GARAGE READY"
);
