const mysql = require('mysql');
const inquirer = require('inquirer');

let bDebugging = false;

let dbConfig = {
  host: 'localhost',
  // Your port; if not 3306
  port: 3306,
  // Your username
  user: 'root',
  // Be sure to update with your own MySQL password!
  password: 'root',
  database: 'employeesDB',
};

let connection = mysql.createConnection( dbConfig );

connection.connect( (err) => {
  if (err) throw err;
  displayMainMenu();
});

const reConnectDB = () => {
  connection.end();
  connection = mysql.createConnection( dbConfig );
};

const createMgrInfo = () => {
  let bError = false;
  let sQuery="";
  let queryRows=[];
  let err=null;
  
  sQuery = `DELETE from mgridlist where mgrid > 0;`;
  // connection.query( query, (err, queryRows) => {
  connection.beginTransaction();
  queryRows = connection.query( sQuery, (err) );
  if ( err ) {
    console.error( err );
    bError = true;
  } else {
    connection.commit();
    sQuery = `INSERT HIGH_PRIORITY `
           + `INTO mgridlist `
           + `SELECT Employees.manager_id as mgrid `
           + `FROM Employees `
           + `GROUP BY Employees.manager_id `
           + `HAVING ( ((Employees.manager_id)>0) );`;
    connection.beginTransaction();
    // connection.query( sQuery, (err, queryRows) => {
    queryRows = connection.query( sQuery, (err) );
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }
  }
  // ------------------------------------------------------------
  if ( !bError ) {
    sQuery = `DELETE FROM mgrinfo WHERE mgrid > 0;`;
    connection.beginTransaction();
    // connection.query(query, (err, queryRows) => {
    queryRows =  connection.query( sQuery, (err) )
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }

    sQuery = `INSERT INTO mgrinfo `
           + `SELECT mgridlist.mgrid, `
           +   `CONCAT( employees.first_name, " ", employees.last_name ), `
           +   `employees.role_id, `
           +   `roles.title, `
           +   `roles.salary, `
           +   `roles.department_id, `
           +   `departments.name `
           + `FROM ((MgrIdList `
           +   `INNER JOIN employees ON MgrIdList.mgrid = employees.id) `
           +   `INNER JOIN roles ON employees.role_id = roles.id) `
           +   `INNER JOIN departments ON roles.department_id = departments.id;`;
              
    connection.beginTransaction();
    // connection.query( sQuery, (err, queryRows) => {
      queryRows =  connection.query( sQuery, (err) );
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      connection.commit();
    }

  }
};

const displayMgrInfo = () => {
  let query = `SELECT * from mgrinfo;`;
  connection.query( query, (err, res) => {
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      for( var i=0; i < res.length; i++ ) {
        console.log( JSON.stringify( res[i].MgrID ) );
      }
    }
  });
};

const retrieveRecordFieldData = ( sField, sRecord ) =>
{
  let aRecordInfo = sRecord.split('|');
  let sFieldData = "";
  var iDataFieldNo = -1;
  
  for( var i=0; (i < sRecord.length) && (iDataFieldNo < 0); i++ )
  {
    switch( i ) {
      case 0:
        if ( sField === 'ID' ) {
          iDataFieldNo=i;
        }
        break;
      case 1:
        if ( sField === 'First Name' ) {
          iDataFieldNo=i;
        }
        break;
      case 2:
        if ( sField === 'Last Name' ) {
          iDataFieldNo=i;
        }
        break;
      case 3:
        if ( sField === 'Title' ) {
          iDataFieldNo=i;
        }
        break;
      case 4:
        if ( sField === 'Department' ) {
          iDataFieldNo=i;
        }
        break;
      case 5:
        if ( sField === 'Salary' ) {
          iDataFieldNo=i;
        }
        break;
      case 6:
        if ( sField === 'Manager' ) {
          iDataFieldNo=i;
        }
        break;
    }
    
    if ( iDataFieldNo >= 0 ) {
      switch ( iDataFieldNo ) {
        case 0:
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
        case 6:
            if ( aRecordInfo[iDataFieldNo] ) {
              if ( iDataFieldNo < aRecordInfo.length ) {
                sFieldData = aRecordInfo[iDataFieldNo];
              }
            }
          break;
      }
    }

  }
  
  return sFieldData;
}

const asDisplayColumns   = ['ID','First Name','Last Name','Title','Department','Salary','Manager'];
const aiDisplayColWidths = [ 2,   12,          12,         22,     18,          6,       20 ];

let sPageColHdr="";
let sPageColDashes="";
let sDisplayRowDelim="";

// isOutputColumn() determines if a query result field is 
// being displayed on the screen:
const isOutputColumn = ( sFieldName ) => {
  let bFound=false;
  var sField2Match = sFieldName.trim().toLowerCase();
  asDisplayColumns.forEach( (element) => {
    var sDisplayField = element.trim().toLowerCase();
    if ( sDisplayField.length === sField2Match.length )
      if ( sDisplayField === sField2Match )
        bFound = true;
  });
  return bFound;
}

const createRowDelimiter = ( iRowLen ) => {
  var sDashes = "";
  for( var d=0; d < iRowLen; d++ ) {
    sDashes += "-";
  }
  return sDashes;
}

const displayAllEmployees = (sGroupByField) => {

  // First, create a inner joinable table of Manager Information:
  // createMgrInfo();
  // displayMgrInfo();

  // console.log( `sGroupByField: ${sGroupByField}` );

  let sOrderBy="";
  switch( sGroupByField ) {
    case( 'Department' ):
      sOrderBy = `roles.department_id`;
      break;
    case( 'Title' ):
      sOrderBy = `roles.title`;
      break;
    case( 'Manager' ):
      sOrderBy = `mgrinfo.manager`;
      break;
    default:
      sGroupByField = "";
      sOrderBy = "employees.id";
  }

  let sQuery = `SELECT `
             + `employees.id AS ID, `
             + `employees.first_name AS "First Name", `
             + `employees.last_name AS "Last Name", `
             + `Roles.title AS Title, `
             + `Departments.name AS Department, `
             + `Roles.salary AS Salary, `
             + `MgrInfo.Manager, `
             + `MgrInfo.MgrTitle, `
             + `MgrInfo.MgrSalary `
             + `FROM MgrInfo `
             + `INNER JOIN ((employees `
             + `  INNER JOIN Roles ON employees.role_id = Roles.id) `
             + `  INNER JOIN Departments ON Roles.department_id = Departments.id) `
             + `ON MgrInfo.MgrID = employees.manager_id `
             + `ORDER BY ${sOrderBy};`;

  // console.log( sQuery );

  connection.query( sQuery, (err, res) => {
    if ( err ) {
      console.error( err );
    } else {
      
      // Needs to match the previous query:
      
      // console.log( `--------------------------------------------------------------------`);
      // console.log( "QUERY:" );
      // console.log( sQuery );
      // console.log( `--------------------------------------------------------------------`);
      // console.log( `MgrInfo query response:` );
      // console.log( res );
      // console.log( `--------------------------------------------------------------------`);
      // let sResData = JSON.stringify(res);
      // console.log( sResData );
      // console.log( `--------------------------------------------------------------------`);
      
      // console.log( `-------------------------------------------------------------------` );
      // console.log( "" );

      let bCreateColHdr = (sPageColHdr.length === 0)
      let aColumnHdrs=[];  // contains the names of each db-field
      let aRecInfoData=[]; // contains the pipe-delimited record

      let sGroupFieldMatch = "";
      
      let iLeftMargin=4;
      var sLeftMargin="";
      for( var i=0; i < iLeftMargin; i++ )
        sLeftMargin += " ";

      // ForEach record in the query results:
      for( let iRecNo=0; iRecNo < res.length; iRecNo++ ) {
        
        let sRecord = JSON.stringify(res[iRecNo]);
        
        // Strip any leading/trailing curly brackets from the record:
        if ( (sRecord[0] === '{') && (sRecord[sRecord.length-1] === '}') ) {
          sRecord = sRecord.substr(1,sRecord.length-2);
        }
        
        let sRecordData="";
        var sFields = sRecord.split(",");
        let sGroupInfo = "";
        
        // ForEach field within the query record result:
        for ( var iColNo=0; iColNo < sFields.length; iColNo++ )
        {
          var iAttrNo = iColNo+1;
          var sAttrNo= ( (iAttrNo < 10 ? "0" : "") + iAttrNo );
          var sFieldInfo = sFields[iColNo];

          var sFieldAttrValue = sFieldInfo.split(":");
          var sRecordFieldInfo = "";
          var sRecordFieldInfo0="";
          var sRecordFieldInfo1="";

          // if either of the 2 attribute/value combos is a quoted string, remove the quotes:
          for( var i=0; i < sFieldAttrValue.length; i++ ) {
            switch( i )
            {
              case 0: // Attribute:
                sRecordFieldInfo0 = sFieldAttrValue[i];
                if ( (sRecordFieldInfo0[0] === '"') && (sRecordFieldInfo0[sRecordFieldInfo0.length-1] === '"') )
                   sRecordFieldInfo0 = sRecordFieldInfo0.substr(1,sRecordFieldInfo0.length-2);
                if ( bCreateColHdr ) {
                  if ( isOutputColumn(sRecordFieldInfo0) )
                    aColumnHdrs.push(sRecordFieldInfo0.trim());
                }
                sRecordFieldInfo = sRecordFieldInfo0;
                break;
              case 1: // Value:
                sRecordFieldInfo1 = (sFieldAttrValue[i] ? sFieldAttrValue[i] : "");
                if ( sRecordFieldInfo1.length > 1 )
                   if ( (sRecordFieldInfo1[0] === '"') && (sRecordFieldInfo1[sRecordFieldInfo1.length-1] === '"') )
                     sRecordFieldInfo1 = sRecordFieldInfo1.substr(1,sRecordFieldInfo1.length-2);
                if ( sRecordFieldInfo1 === 'null' )
                  sRecordFieldInfo1 = "";
                sRecordFieldInfo += ( " :: " + sRecordFieldInfo1 );
                sRecordData += ( ((sRecordData.length > 0) ? "|" : "") + sRecordFieldInfo1 );
                
                if ( sGroupByField.length > 0 ) {
                  if ( sGroupByField === sRecordFieldInfo0 ) {
                    if ( iRecNo === 0 ) {
                      // the first group:
                      sGroupFieldMatch = sRecordFieldInfo1;
                      sGroupInfo = `${sRecordFieldInfo0}: "${sRecordFieldInfo1}"`;
                    } else if ( sGroupFieldMatch !== sRecordFieldInfo1 ) {
                      // A group change:
                      sGroupFieldMatch = sRecordFieldInfo1;
                      sGroupInfo = `${sRecordFieldInfo0}: "${sRecordFieldInfo1}"`;
                    }
                  }
                };
                break;
              default:
                break;
            }
          } // endFor( k ) Attribute:Value pair
          
        } // endFor( iColNo ) : Each Field
        
        // Objective:
        // ['ID','First_Name','Last_Name','Title','Department','Salary','Manager'];
        // [ 2,   10,          10,         18,     11,          6,       16];
        // ID  First_Name  Last_Name-  Title-------------  Department-  Salary  Manager---------
        
        if ( bCreateColHdr ) {
          iColNo=0;
          aColumnHdrs.forEach( element => {
            var sFieldColHdr=element;
            var sSpaces = "";
            var sDashes = "";
            for( let j=0; j < aiDisplayColWidths[iColNo]; j++ ) {
              sSpaces += " ";
              sDashes += "-";
            }
            sFieldColHdr += sSpaces;
            sFieldColHdr = sFieldColHdr.substr(0,aiDisplayColWidths[iColNo]);
            sPageColHdr += ( sFieldColHdr + ((iColNo < aiDisplayColWidths.length-1) ? "  " : "" ) );
            sPageColDashes += ( sDashes + ((iColNo < aiDisplayColWidths.length-1) ? "  " : "" ) );
            iColNo++;
          });
          bCreateColHdr = false;
          sDisplayRowDelim = createRowDelimiter( sPageColDashes.length );
        }

        if ( iRecNo === 0 ) {
          console.log( `${sLeftMargin}${sDisplayRowDelim}` );
          console.log( `${sLeftMargin}${sPageColHdr}` );
          console.log( `${sLeftMargin}${sPageColDashes}` );
        }

        aRecInfoData.push( sRecordData );

        if ( sGroupInfo.length > 0 ) {
          console.log( `\n${sLeftMargin}${sGroupInfo}` );
          sGroupInfo="";
        }
        
        // Build a displayable row to output to the console:
        iColNo=0; 
        let sDataOutput="";
        asDisplayColumns.forEach( (sColHdr) => {
          var sFieldData = retrieveRecordFieldData( sColHdr, sRecordData );
          var sSpaces = "";
          for( let j=0; j < aiDisplayColWidths[iColNo]; j++ ) {
            sSpaces += " ";
          }
          sFieldData += sSpaces;
          sFieldData = sFieldData.substr(0,aiDisplayColWidths[iColNo]);
          sDataOutput += ( sFieldData + ( (iColNo < asDisplayColumns.length-1) ? "  " : "") );
          iColNo++;
        });
        console.log( `${sLeftMargin}${sDataOutput}` );
        
        // If I want to add a line of dashes to the display output between each record:
        // console.log( sPageColDashes );
        
      } // endForEach( record )
      
      console.log( `${sLeftMargin}${sDisplayRowDelim}` );
    }
    displayMainMenu();
  });
};

// let secondsLeft = 0;
// const runQuery = ( sQuery, iSecondsToPause ) => {
//   let bError=false;
//   let queryRows=[];
  
//   secondsLeft = iSecondsToPause;
//   let iTotalMilliSecs = secondsLeft*1000;

//   // Execute the query:
//   var err=null;
//   connection.beginTransaction();
//   console.log( sQuery );
//   queryRows = connection.query( sQuery, (err) );
//   if ( err ) {
//     console.error( err );
//     bError = true;
//   } else {
//     connection.commit();
//   }

//   if ( !bError ) {
//     var timerInterval = setInterval( function() {
//       secondsLeft--;
//       if (secondsLeft === 0) {
//         // Stops execution of action at set interval
//         clearInterval(timerInterval);
//         // var sQueryResults = JSON.stringify( queryRows ? queryRows : "" );
//         // console.log( `Query Rows === ${sQueryResults}` );
//         return queryRows;
//       }

//     }, iTotalMilliSecs );
//   }

//   return( queryRows );
// }

let bEmployeeExists=false;

const verifyEmployeeADD = (sFirstName,sLastName) => {
  let bError = false;
  let err;
  let queryRows;
  let iFound=0;
  let bConfirmed=false;
  
  let sQuery = `SELECT first_name, last_name FROM employees `
             + `WHERE first_name = "${sFirstName}" AND last_name = "${sLastName}";`;
  if ( bDebugging )
    console.log( sQuery );

  // queryRows = runQuery(sQuery,1);
  // if ( queryRows )
  // {
  //   console.log( `Back from runQuery()` );
  //   // var sQueryRows = JSON.stringify( queryRows );
  //   // console.log( sQueryRows );
  // }

  // queryRows = connection.query( sQuery, (err) );
  connection.query( sQuery, (err, queryRows) => {
    if ( err ) {
      console.error( err );
      bError = true;
    } else {
      if ( queryRows ) {
        if ( queryRows.length > 0 ) {
          queryRows.forEach( ({ first_name, last_name }) => {
            if ( bDebugging )
              console.log( `Matched employee: [${first_name} ${last_name}]` );
            bEmployeeExists = true;
            iFound++;
          });
        }
      }
      if ( iFound === 0 ) {
        if ( bDebugging )
          console.log( `the employee was NOT found...` );
      }
    }
  });

  inquirer
  .prompt({
    name: 'action',
    type: 'list',
    message: 'Are you sure you wish to ADD this employeee?',
    choices: [
      'Yes',
      'No'
    ],
    })
  .then( (answer) => {
    
    // console.log( `======================================================` );
    // for( var i=0; i < employeeInfo.length; i++ ) {
    //   var aEmpInfo = JSON.stringify(employeeInfo[i]).split(':');
    //   if ( aEmpInfo.length === 2 )
    //     console.log( aEmpInfo[0], ":", aEmpInfo[1] );
    // }
    // console.log( `======================================================` );
    
      if ( answer.action === 'Yes' ) {
        bConfirmed = (iFound === 0);
        if ( bConfirmed )
        {
          if ( bDebugging )
            console.log( "Adding new employee information..." );
          displayMainMenu();
        }
      }

    });

  // if ( bConfirmed )
  // {
  //   console.log( "Adding new employee information..." );
  //   displayMainMenu();
  // }
  // else {
  //   // displayMainMenu();
  // }
  // return( bConfirmed );
};

function retrieveEmployeeInfo( empInfo ) {
  var bIsValidData=true;
  let aFieldData=[];

  for( var iFieldIdx=0; iFieldIdx < empInfo.length; iFieldIdx++ )
  {
    var sData = JSON.stringify(empInfo[iFieldIdx]);
    if ( sData.length > 1 )
      if ( sData[0] === '{' && sData[sData.length-1] === '}' )
        sData = sData.substr(1,sData.length-2);
    var aEmpInfoField = sData.split(':');
    if ( aEmpInfoField.length === 2 ) {
      var sFieldName = aEmpInfoField[0].trim();
      var FieldData = aEmpInfoField[1].trim();
      if ( sFieldName.length > 1 )
        if ( (sFieldName[0] === '"') && (sFieldName[sFieldName.length-1] === '"') )
          sFieldName = sFieldName.substr(1,sFieldName.length-2);
      if ( FieldData.length > 1 )
        if ( (FieldData[0] === '"') && (FieldData[FieldData.length-1] === '"') )
          FieldData = FieldData.substr(1,FieldData.length-2);

      // employeeInfo:
      switch( iFieldIdx ) {
        case 0: // first_name
        case 1: // last_name
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData.length > 0 );
          break;
        case 2: // title
        case 3: // manager
          aFieldData.push(FieldData);
          break;
        case 4: // role_id
        case 5: // department_id
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData > 0 );
          break;
        case 6: // manager_id
          aFieldData.push(FieldData);
          if ( bIsValidData )
            bIsValidData = ( FieldData >= 0 );
          break;
      }
      
    }
  }

  return( aFieldData );
}

const addEmployeeRecord = ( empInfo ) => {
  var bIsValidData=true;
  var iNewRecID=0;

  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }
  
  let aFieldData = [];
  let sDatarec = "";
  console.log( JSON.stringify(empInfo) );
  aFieldData = retrieveEmployeeInfo( empInfo );
  for( var iFieldIdx=0; iFieldIdx < aFieldData.length; iFieldIdx++ ) {
    var sFieldData = aFieldData[iFieldIdx];
    sDatarec += (sFieldData + ((iFieldIdx < aFieldData.length-1) ? "|" : "" ) );
    switch( iFieldIdx ) {
      case 0: // first_name
        if ( bIsValidData )
          bIsValidData = (sFieldData.trim().length > 0);
        break;
      case 1: // last_name
        if ( bIsValidData )
          bIsValidData = (sFieldData.trim().length > 0);
        break;
      case 2: // title
        break;
      case 3: // manager
        break;
      case 4: // role_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData > 0 );
        break;
      case 5: // department_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData > 0 );
        break;
      case 6: // manager_id
        if ( bIsValidData )
          bIsValidData = ( sFieldData >= 0 );
        break;
    }

  }
  // sDatarec += "]";
  if ( bDebugging )
  {
    console.log( `addEmployeeRecord: [${sDatarec}]` );
  }
  
  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }

  if ( !bIsValidData ) {
    console.log( "Invalid data! Try again..." );
  } else {

    // Insert new record:
    if ( !bEmployeeExists )
    {
      if ( bDebugging )
        console.log( "Adding new record..." );

      var aDataElements = sDatarec.split('|');
      
      let sQuery = `INSERT INTO employees `
                 + `(first_name,last_name,role_id,manager_id) `
                 + `VALUES `
                 + `("${aDataElements[0]}","${aDataElements[1]}",${aDataElements[4]},${aDataElements[6]});`;
      if ( bDebugging )
        console.log( `addEmployeeRecord(): [${sQuery}]` );
      
      connection.beginTransaction();
      connection.query( sQuery, (err,res) => {
        if (err) throw err;
        connection.commit();
        iNewRecID = res.insertId;

        // var sChoice="";
        // inquirer
        // .prompt({
        //   name: 'action',
        //   type: 'list',
        //   message: `New ID: [${iNewRecID}]`,
        //   choices: [ 'Yes','No'],
        // })
        // .then( (answer) => {
        //   sChoice = answer.choice;
        // });

        // console.log(`ADD RECORD New ID: [${iNewRecID}]`);
      });
    }
  }
  
  return( iNewRecID );

};

let employeeInfo = [
  { first_name : "" },
  { last_name : "" },
  { title : "" },
  { manager : "" },
  { role_id: 0 },
  { department_id : 0 },
  { manager_id: 0 }
];

const updateEmployeeRole = () => {
  let sEmployeeName="";
  let sNewTitle="";

  // query the database for all employees:
  let sQuery  = `SELECT `
              +   `employees.id, `
              +   `employees.first_name, `
              +   `employees.last_name, `
              +   `employees.role_id, `
              +   `Roles.title AS role_title, `
              +   `Departments.name AS dept_name, `
              +   `MgrInfo.Manager `
              + `FROM MgrInfo `
              + `INNER JOIN ((employees `
              +   `INNER JOIN Roles ON employees.role_id = Roles.id) `
              +   `INNER JOIN Departments ON Roles.department_id = Departments.id) `
              + `ON MgrInfo.MgrID = employees.manager_id `
              + `ORDER BY employees.last_name, employees.first_name, employees.id;`;

  connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of employees, prompt the user to select one:
    
    let aEmployeeIDs = [];
    results.forEach( ({ id, first_name, last_name, role_id, role_title }) => {
      aEmployeeIDs.push( {id, first_name, last_name, role_id, role_title} );
    });
    
    if ( results.length > 0 ) {
    
      inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, role_title }) => {
              var sName = `${last_name}, ${first_name} (${role_title})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to update:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var iRoleID=0;
        var sCurrentRole="";
        var iStrIdx = sEmployeeName.indexOf(" (");
        // remove the role tite:
        if ( iStrIdx > 0 ) {
          var iLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iLen > 0 )
            sCurrentRole = sEmployeeName.substr(iStrIdx+2,iLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
        
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeIDs.length; i++ ) {
            if ( aEmployeeIDs[i].first_name === aEmployeeElements[1].trim()
                  && aEmployeeIDs[i].last_name === aEmployeeElements[0].trim() 
                  && aEmployeeIDs[i].role_title === sCurrentRole )
            {
              iEmployeeID = aEmployeeIDs[i].id;
              iRoleID = aEmployeeIDs[i].role_id;
            }
          }
          if ( iEmployeeID > 0 ) {
            
            if ( bDebugging)
              console.log( `updateEmployeeRole(): [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()}] [${iRoleID}: ${sCurrentRole}]` );

            // Create a list of roles to pick from:
            sQuery = `select id, title from roles where id <> ${iRoleID} order by title`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
              
              let aRolesInfo = [];
              results.forEach( ({ id, title }) => {
                aRolesInfo.push( {id, title} );
              });

              inquirer
              .prompt([
                {
                  name: 'choice',
                  type: 'rawlist',
                  choices() {
                    const choiceArray = [];
                    results.forEach( ({ title }) => {
                      choiceArray.push( title );
                    });
                    choiceArray.push( "[ADD new title]" );
                    return choiceArray;
                  },
                  message: 'Select the new role for the employee:',
                },
              ])
              .then( (answer) => {
                var sNewTitle = answer.choice;
                var iNewTitleID = 0;
                if ( sNewTitle === '[ADD new title]' ) {
                  addNewRole();
                }
                else {
                  for( var i=0; (iNewTitleID <= 0) && (i < aRolesInfo.length); i++ ) {
                    if ( aRolesInfo[i].title === sNewTitle ) {
                      iNewTitleID = aRolesInfo[i].id;
                    }
                  }
                  if ( iNewTitleID > 0 )
                  {
                    if ( bDebugging)
                      console.log( `updateEmployeeRole(): [${iNewTitleID}: [${sNewTitle}]` );

                    sQuery = `UPDATE employees SET employees.role_id = ${iNewTitleID} WHERE id = ${iEmployeeID};`;
                    connection.query( sQuery, (err, results) => {
                      if (err) throw err;
                      // displayMainMenu();
                    });
        
                  } // endIf( iNewTitleID > 0 )
                  displayMainMenu();
                }
                
              }); // endInquirerPrompt
              
            }); // endQuery( roles )
            
          } // endIf( iEmployeeID > 0 )
          
        } else {
          console.log( "PROBLEM with the employee selected: [" + sEmployeeName + "]" );
        }

      });
      
    }
    else {
      displayMainMenu();
    }
    
  });

  return;
}

const updateEmployeeManager = () => {
  let sEmployeeName="";
  let sNewManager="";

  // query the database for all employees:
  // let sQuery = 
  //   `SELECT Employees.id, `
  //     + `Employees.first_name, `
  //     + `Employees.last_name, `
  //     + `Employees.manager_id, `
  //     + `Employees.role_id, `
  //     + `Roles.title AS roles_title `
  //     + `FROM (Employees `
  //       + `LEFT JOIN MgrInfo ON Employees.id = MgrInfo.mgrid) `
  //       + `INNER JOIN Roles ON Employees.role_id = Roles.id `
  //     + `WHERE ( ((MgrInfo.Manager) Is Null) ) `
  //     + `ORDER BY Employees.last_name, Employees.first_name;`;

  let sQuery = `SELECT Employees.id, `
           +   `Employees.first_name, `
           +   `Employees.last_name, `
           +   `Employees.manager_id, `
           +   `Employees.role_id, `
           +   `Roles.title AS roles_title, `
           +   `MgrInfo.Manager `
           + `FROM MgrInfo `
           + `INNER JOIN (Employees `
           +   `INNER JOIN Roles ON Employees.role_id = Roles.id) `
           +   `ON MgrInfo.mgrid = Employees.manager_id `
           + `ORDER BY Employees.last_name, Employees.first_name;`;
      
  if ( bDebugging )
   console.log( sQuery );

  connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of managers, prompt the user to select one:
    
    let aEmployeeInfo = [];
    results.forEach( ({ id, first_name, last_name, role_id, roles_title, manager }) => {
      aEmployeeInfo.push( {id, first_name, last_name, role_id, roles_title, manager} );
    });
    
    if ( results.length > 0 ) {
    
      inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, roles_title }) => {
              var sName = `${last_name}, ${first_name} (${roles_title})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to update:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var iRoleID=0;
        var sCurrentRole="";
        let sCurrentManager="";

        // remove the role tite that was only displayed for informational purposes:
        var iStrIdx = sEmployeeName.indexOf(" (");
        if ( iStrIdx > 0 ) {
          var iLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iLen > 0 )
            sCurrentRole = sEmployeeName.substr(iStrIdx+2,iLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
        
        // The choice should be "last_name, first_name"
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeInfo.length; i++ ) {
            if ( aEmployeeInfo[i].first_name === aEmployeeElements[1].trim()
                 && aEmployeeInfo[i].last_name === aEmployeeElements[0].trim()  )
            {
              iEmployeeID = aEmployeeInfo[i].id;
              iRoleID = aEmployeeInfo[i].role_id;
              sCurrentManager = ( aEmployeeInfo[i].manager ? aEmployeeInfo[i].manager : "" );
            }
          }
          if ( iEmployeeID > 0 ) {
            
            if ( bDebugging)
              console.log( `updateEmployeeManager(): [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()}] [${iRoleID}: ${sCurrentRole}]` );

            // Create a list of managers to pick from:
            sQuery = `SELECT Employees.id, `
                  +   `Employees.first_name, `
                  +   `Employees.last_name, `
                  +   `Employees.manager_id, `
                  +   `Employees.role_id, `
                  +   `Roles.title AS roles_title, `
                  +   `MgrInfo.Manager `
                  + `FROM MgrInfo `
                  + `INNER JOIN (Employees `
                  +   `INNER JOIN Roles ON Employees.role_id = Roles.id) `
                  +   `ON MgrInfo.mgrid = Employees.manager_id `
                  + `WHERE Employees.id <> ${iEmployeeID} `
                  + `ORDER BY Employees.last_name, Employees.first_name;`;
 
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
              
              let aManagerInfo = [];
              // results.forEach( ({ mgrid, Manager, MgrTitle }) => {
              //   aManagerInfo.push( {mgrid,Manager,MgrTitle} );
              // });
              results.forEach( ({ id, first_name, last_name, role_id, roles_title, manager }) => {
                aManagerInfo.push( {id, first_name, last_name, role_id, roles_title, manager} );
              });
          
              var sMenuPrompt = `Set the new manager to`
                                + (sCurrentManager.length > 0 ? ` (currently ${sCurrentManager})` : ``);
              
              inquirer
              .prompt([
                {
                  name: 'choice',
                  type: 'rawlist',
                  choices() {
                    const choiceArray = [];
                    results.forEach( ({ first_name, last_name, roles_title }) => {
                      var sName = `${last_name}, ${first_name} (${roles_title})`;
                      choiceArray.push( sName );
                    });
                    choiceArray.push( "[No Manager]" );
                    choiceArray.push( "[Add New Manager]" );
                    return choiceArray;
                  },
                  message: `${sMenuPrompt}:`,
                },
              ])
              .then( (answer) => {
                var sNewManager = answer.choice;
                var iNewMgrID = -1;

                if ( sNewManager === '[No Manager]' ) {
                  sNewManager = "";
                  iNewMgrID = 0;
                } else if ( sNewManager === '[Add New Manager]' ) {
                  console.log( "ADD new manager has been requested..." );
                  sNewManager = "";
                  addNewEmployee( iEmployeeID, 0 );
                }

                if ( iNewMgrID >= 0 || sNewManager.length > 0 )
                {
                  var iStrIdx = sNewManager.indexOf(" (");
                  // remove the role tite:
                  if ( iStrIdx > 0 ) {
                    var iLen = ( sNewManager.length - iStrIdx - 3 );
                    if ( iLen > 0 )
                      // sCurrentRole = sNewManager.substr(iStrIdx+2,iLen);
                      sNewManager = sNewManager.substr(0,iStrIdx);
                  } else {
                    sNewManager = "";
                  }
                  
                  // Allow the user to un-assign the associated manager:
                  if ( sNewManager.length === 0 )
                    iNewMgrID = 0;

                  var aElements = sNewManager.split(',');
                  if ( aElements.length === 2 )
                  {
                    for( var i=0; i < aManagerInfo.length; i++ ) {
                      if ( aManagerInfo[i].first_name === aElements[1].trim()
                            && aManagerInfo[i].last_name === aElements[0].trim()  )
                      {
                        iNewMgrID = aManagerInfo[i].id;
                      }
                    }
                    // if ( iNewMgrID > 0 ) {
                    // }
                  }
                                
                  for( var i=0; (iNewMgrID < 0) && (i < aManagerInfo.length); i++ ) {
                    if ( aManagerInfo[i].Manager === sNewManager )
                    {
                      iNewMgrID = aManagerInfo[i].id;
                    }
                  }

                  if ( iNewMgrID >= 0 )
                  {
                    if ( bDebugging)
                      console.log( `updateEmployeeManager(): [${iNewMgrID}: [${sNewManager}]` );

                    sQuery = `UPDATE employees SET employees.manager_id = ${iNewMgrID} WHERE id = ${iEmployeeID};`;
                    connection.query( sQuery, (err, results) => {
                      if (err) throw err;
                    });
        
                  } // endIf( iNewTitleID > 0 )
                  
                  displayMainMenu();
                }
                
              }); // endInquirerPrompt
              
            }); // endQuery( roles )
            
          } // endIf( iEmployeeID > 0 )
          
        } else {
          console.log( "PROBLEM with employee selected: [" + sEmployeeName + "]" );
        }

      });
      
    } else {
      displayMainMenu();
    }
    
  });
  
  return;
}

const addDepartmentRecord = ( sNewDeptName ) => {
  console.log( `ADD Department record for: "${sNewDeptName}"` );
  displayMainMenu();
}

const addNewDepartment = () => {

  inquirer
  .prompt([
    {
      type: 'input',
      name: 'deptName',
      message: 'Enter the name of the new Department:',
    }
  ])
  .then( (answers) => {
    var sDeptName = answers.deptName;
    console.log( `ADDING Department: "${sDeptName}"` );

    let aDeptNames=[];
    // connection.query( 'SELECT * FROM departments WHERE name = "${sDeptName}"', (err, results) => {
    connection.query( 'SELECT * FROM departments', (err, results) => {
      if (err) throw err;
      results.forEach( ({id, name}) => {
        aDeptNames.push( {id, name} );
      });

      if ( aDeptNames.length > 0 ) {
        var bExists=false;
        for( var i=0; (!bExists) && (i < aDeptNames.length); i++ ) {
          if ( aDeptNames[i].name.toLowerCase() === sDeptName.toLowerCase() ) {
            bExists = true;
          }
        }
        if ( bExists ) {
          console.log( "That Department already exists!" );
          displayMainMenu();
        } else
          addDepartmentRecord( sDeptName );
      }
      else
        addDepartmentRecord( sDeptName );
    });
  });

}

let roleInfo = {
  role_title : "",
  salary : 0,
  dept_id : 0,
  new_RoleID : 0
};

const addRoleRecord = ( newRole ) => {
  var bIsValidData=true;
  var iNewRecID=0;

  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }
  
  let sDatarec = "";
  let FieldData = "";

  if ( bDebugging )
    console.log( JSON.stringify(roleInfo) );

  var iTotalFields=4;
  for( var iFieldIdx=0; iFieldIdx < iTotalFields; iFieldIdx++ ) {
    switch( iFieldIdx ) {
      case 0: // role_title
        FieldData = roleInfo.role_title;
        if ( bIsValidData )
          bIsValidData = (FieldData.trim().length > 0);
        break;
      case 1: // salary
        FieldData = roleInfo.salary;
        if ( bIsValidData ) {
          bIsValidData = (FieldData > 0);
        }
        break;
      case 2: // dept_id
        FieldData = roleInfo.dept_id;
        if ( bIsValidData ) {
          bIsValidData = (FieldData > 0);
        }
        break;
      case 3: // new_RoleID
        FieldData = roleInfo.new_RoleID;
        if ( bIsValidData )
          bIsValidData = !( FieldData != 0 );
        break;
    }
    sDatarec += (FieldData + ((iFieldIdx < iTotalFields-1) ? "|" : "" ) );
  }

  // sDatarec += "]";
  if ( bDebugging )
  {
    console.log( `addRoleRecord: [${sDatarec}]` );
  }
  
  if ( bDebugging ) {
    console.log( `====================================================================================` );
  }

  if ( !bIsValidData ) {
    console.log( "Invalid data for the new role! Try again..." );
    displayMainMenu();
  } else {

    // Insert new record:
    if ( bDebugging )
      console.log( "Adding new role..." );

    var aDataElements = sDatarec.split('|');
    
    let sQuery = `INSERT INTO roles `
                + `(title,salary,department_id) `
                + `VALUES `
                + `( "${aDataElements[0]}", ${aDataElements[1]}, ${aDataElements[2]} );`;
    if ( bDebugging )
      console.log( `addRoleRecord(): [${sQuery}]` );
    
    connection.beginTransaction();
    connection.query( sQuery, (err,res) => {
      if (err) throw err;
      connection.commit();
      iNewRecID = res.insertId;

      // var sChoice="";
      // inquirer
      // .prompt({
      //   name: 'action',
      //   type: 'list',
      //   message: `New ID: [${iNewRecID}]`,
      //   choices: [ 'Yes','No'],
      // })
      // .then( (answer) => {
      //   sChoice = answer.choice;
      // });

      if ( bDebugging )
        console.log(`ADD RECORD New ID: [${iNewRecID}]`);

      displayMainMenu();

    });
  }
  
  return( iNewRecID );
}

const addNewRole = () => {

  console.log( 'In order to define a new Role/Title, enter the new Title, Salary and Department:' );

  inquirer
  .prompt([
    {
      type: 'input',
      name: 'roleTitle',
      message: 'Enter a new Title:',
    },
    {
      type: 'input',
      name: 'roleSalary',
      message: 'Enter the salary for this new role:'
    }
  ])
  .then( (answers) => {
    var sRoleTitle = answers.roleTitle;
    var nRoleSalary = answers.roleSalary;
    console.log( `ADDING: Roles/Title: ${sRoleTitle} earning ${nRoleSalary}` );

    let aDeptNames=[];
    connection.query( 'SELECT * FROM departments ORDER BY name', (err, results) => {
      if (err) throw err;
      
      // Once you have the list of current/valid departments, prompt the user to select one:
      results.forEach( ({id, name}) => {
        aDeptNames.push( {id, name} );
      });

      inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          message: `Select the department for '${sRoleTitle}':`,
          choices() {
            const choiceArray = [];
            results.forEach( ({ name }) => {
              choiceArray.push( name );
            });
            choiceArray.push( "[ADD new Department]" );
            return choiceArray;
          },
        },
      ])
      .then( (answer) => {
        var iDeptID=0;
        var sDeptName = answer.choice;

        if ( sDeptName === "[ADD new Department]" ) {
          addNewDepartment();
        } else {
          for( var i=0; (i < aDeptNames.length) && (iDeptID === 0); i++ ) {
            if ( aDeptNames[i].name === sDeptName ) {
              iDeptID = aDeptNames[i].id;
            }
          }
          if ( bDebugging )
            console.log( `[Defining NEW role]: Title:"${sRoleTitle}" in Dept: [${iDeptID}]"${sDeptName}"` );
            
          roleInfo.role_title = sRoleTitle;
          roleInfo.salary = nRoleSalary;
          roleInfo.dept_id = iDeptID;
          roleInfo.new_RoleID = 0;
          addRoleRecord( roleInfo );
        }

        // displayMainMenu();
      });
    });

    // displayMainMenu();
  });

}

const removeEmployee = () => {
  let sEmployeeName="";
  
  // query the database for all employees:
  let sQuery  = `SELECT `;
      sQuery += `employees.id, `;
      sQuery += `employees.first_name, `;
      sQuery += `employees.last_name, `;
      sQuery += `Roles.title AS role_title, `;
      sQuery += `Departments.name AS dept_name, `;
      sQuery += `MgrInfo.Manager `;
      sQuery += `FROM MgrInfo `;
      sQuery += `INNER JOIN ((employees `;
      sQuery += `INNER JOIN Roles ON employees.role_id = Roles.id) `;
      sQuery += `INNER JOIN Departments ON Roles.department_id = Departments.id) `;
      sQuery += `ON MgrInfo.MgrID = employees.manager_id `;
      sQuery += `ORDER BY employees.last_name, employees.first_name, employees.id;`;

  connection.query( sQuery, (err, results) => {
    if (err) throw err;

    // Once you have the list of employees, prompt the user to select one:
    
    let aEmployeeIDs = [];
    results.forEach( ({ id, first_name, last_name, dept_name }) => {
      aEmployeeIDs.push( {id, first_name, last_name, dept_name} );
    });
    
    if ( results.length > 0 ) {
      inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          choices() {
            const choiceArray = [];
            results.forEach( ({ first_name, last_name, dept_name }) => {
              var sName = `${last_name}, ${first_name} (${dept_name})`;
              choiceArray.push( sName );
            });
            return choiceArray;
          },
          message: 'Select the employee to remove:',
        },
      ])
      .then( (answer) => {
        sEmployeeName = answer.choice;
        var iEmployeeID=0;
        var sDeptName="";
        var iStrIdx = sEmployeeName.indexOf(" (");
        // remove the department name:
        if ( iStrIdx > 0 ) {
          var iDeptLen = ( sEmployeeName.length - iStrIdx - 3 );
          if ( iDeptLen > 0 )
            sDeptName = sEmployeeName.substr(iStrIdx+2,iDeptLen);
          sEmployeeName = sEmployeeName.substr(0,iStrIdx);
        }
    
        var aEmployeeElements = sEmployeeName.split(',');
        if ( aEmployeeElements.length === 2 )
        {
          for( var i=0; i < aEmployeeIDs.length; i++ ) {
            if ( aEmployeeIDs[i].first_name === aEmployeeElements[1].trim()
                  && aEmployeeIDs[i].last_name === aEmployeeElements[0].trim() 
                  && aEmployeeIDs[i].dept_name === sDeptName )
            {
              iEmployeeID = aEmployeeIDs[i].id;
            }
          }
          if ( iEmployeeID > 0 ) {
            sQuery = `UPDATE employees SET manager_id = 0 WHERE manager_id = ${iEmployeeID};`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
            });
            if ( bDebugging )
              console.log( `DELETE Employee: [${iEmployeeID}: ${aEmployeeElements[1].trim()} ${aEmployeeElements[0].trim()} in ${sDeptName}]` );
            sQuery = `DELETE FROM employees WHERE id = ${iEmployeeID}`;
            connection.query( sQuery, (err, results) => {
              if (err) throw err;
            });
          }

        } else {
          console.log( "Unable to DELETE Employee selected: [" + sEmployeeName + "]" );
        }

        displayMainMenu();

      });
      
    }

  });

  return;
}

const addNewEmployee = ( iEmployee2Update, iManagerID ) => {
  let sRole="";
  let sMgrName="";
  
  // bEmployeeExists = false;
  employeeInfo[0].first_name = "";
  employeeInfo[1].last_name = "";

  inquirer
  .prompt([
    {
      type: 'input',
      name: 'firstName',
      message: 'What is the employees first name:',
    },
    {
      type: 'input',
      name: 'lastName',
      message: 'What is the employees last name:',
    },
  ])
  .then( (answers) => {

    employeeInfo[0].first_name = answers.firstName.trim();
    employeeInfo[1].last_name  = answers.lastName.trim();

    // query the database for all roles:
    let aRolesInfo=[];

    connection.query( 'SELECT * FROM roles ORDER BY title', (err, results) => {
      if (err) throw err;
      // Once you have the list of current/valid titles, prompt the user to select one:
      results.forEach( ({id, title, department_id}) => {
        aRolesInfo.push( {id, title, department_id} );
      });

      inquirer
      .prompt([
        {
          name: 'choice',
          type: 'rawlist',
          message: 'Select the employee Title:',
          choices() {
            const choiceArray = [];
            results.forEach( ({ title }) => {
              choiceArray.push( title );
            });
            choiceArray.push( "[ADD new title]" );
            return choiceArray;
          },
        },
      ])
      .then( (answer) => {
        sRole = answer.choice;
        // console.log( "Selected Role: [" + sRole + "]" );
        employeeInfo[2].title = sRole;
        // console.log( employeeInfo );

        if ( sRole === '[ADD new title]' ) {
          addNewRole();
        }
        else {

        employeeInfo[4].role_id = 0;
        employeeInfo[5].department_id = 0;
        for( var i=0; (i < aRolesInfo.length) && (employeeInfo[4].role_id === 0); i++ ) {
          if ( aRolesInfo[i].title === sRole ) {
            employeeInfo[4].role_id = aRolesInfo[i].id;
            employeeInfo[5].department_id = aRolesInfo[i].department_id;
          }
        }

        // connection.query( 
        //   'SELECT roles.id AS roles_id, department_id FROM roles WHERE ?',
        //   { title: employeeInfo[2].title }
        //   , (err, results) => {
        //     if (err) throw err;
        //     // for( var i=0; i < results.length; i++ ) {
        //     //   console.log( JSON.stringify( results[i] ) );
        //     // }
        //     results.forEach( ({ roles_id, department_id }) => {
        //       // console.log( `Role: [${roles_id}], Department: [${department_id}]` );
        //       employeeInfo[4].role_id = roles_id;
        //       employeeInfo[5].department_id = department_id;
        //     });
        //   }
        // );

        if ( iEmployee2Update > 0 && iManagerID === 0 )
        {
          // We are adding a new manager for an existing employee...

          employeeInfo[6].manager_id = iManagerID;

          inquirer
          .prompt({
            name: 'action',
            type: 'list',
            message: 'Are you sure you wish to ADD this manager?',
            choices: [ 'Yes','No'],
          })
          .then( (answer) => {
            if ( bDebugging ) {
              let aFieldData = [];
              let sDatarec = "addNewManager(): [";
              aFieldData = retrieveEmployeeInfo( employeeInfo );
              if ( aFieldData.length === 7 ) {
                for( var i=0; i < aFieldData.length; i++ ) {
                  var sFieldData = aFieldData[i];
                  sDatarec += (sFieldData + ((i < aFieldData.length-1) ? "," : "" ) );
                }
                sDatarec += "]";
                console.log( sDatarec );
              }
            }
            if ( answer.action === 'Yes' ) {
              console.log( employeeInfo );
              let iMgrID=addEmployeeRecord(employeeInfo);
              if ( iMgrID === 0 ) {
                let sQuery1 = `SELECT * FROM employees `
                            + `WHERE first_name="${employeeInfo[0].first_name}" `
                            + `AND `
                            + `last_name="${employeeInfo[1].last_name}";`;
                // console.log( `LocateEmployeeQ: ${sQuery1}` );
                // var sChoice="";
                // inquirer
                // .prompt({
                //   name: 'action',
                //   type: 'list',
                //   message: 'Are you READY1?',
                //   choices: [ 'Yes','No'],
                // })
                // .then( (answer) => {
                //   sChoice = answer.choice;
                  connection.query( sQuery1, (err, results) => {
                    if (err) throw err;
                    results.forEach( ({ id, first_name, last_name, manager_id }) => {
                      iManagerID = manager_id;
                    });
                  });

                  let sQuery2 = `UPDATE employees SET manager_id = ${iManagerID} WHERE id = ${iEmployee2Update};`;
                  // console.log( `UpdateEmployeeQ: ${sQuery2}` );

                  // sChoice="";
                  // inquirer
                  // .prompt({
                  //   name: 'action',
                  //   type: 'list',
                  //   message: 'Are you READY2?',
                  //   choices: [ 'Yes','No'],
                  // })
                  // .then( (answer) => {
                  //   sChoice = answer.choice;
                    connection.query( sQuery2, (err, results) => {
                      if (err) throw err;
                    });
                  // });
                    
                // });

              }
              if ( iMgrID > 0 ) {
                if ( bDebugging )
                  console.log( `Manager [${iMgrID}] was added!` );
              } else {
                // console.log( "The manager could not be added!  Try again..." );
              }
            }
            displayMainMenu();
          });
          
        }
        else // if ( iEmployee2Update <= 0 || iManagerID <= 0 )
        {
          // query the database for all managers:
          connection.query( 'SELECT manager, mgrdeptname FROM mgrinfo WHERE mgrid > 0 ORDER BY manager', (err, results) => {
            if (err) throw err;
            // Once you have the list of current/valid managers, prompt the user to select a manager:
            inquirer
              .prompt([
                {
                  name: 'choice',
                  type: 'rawlist',
                  choices() {
                    const choiceArray = [];
                    results.forEach( ({ manager, mgrdeptname }) => {
                      var sMgrInfo = `${manager} (${mgrdeptname})`;
                      // console.log( sMgrInfo );
                      choiceArray.push( sMgrInfo );
                    });
                    choiceArray.push( "(none)" );
                    return choiceArray;
                  },
                  message: 'Select a Manager:',
                },
              ])
              .then( (answer) => {
                sMgrName = answer.choice;

                employeeInfo[3].manager = "";
                if ( sMgrName === '(none)' ) {
                  sMgrName="";
                  employeeInfo[6].manager_id = 0;
                } else {
                  // Remove the department name from the choice:
                  var iIdx = sMgrName.indexOf( " (");
                  if ( iIdx >= 0 ) {
                    sMgrName = sMgrName.substr(0,iIdx);
                  }
                  sMgrName = sMgrName.trim();
                  employeeInfo[3].manager = sMgrName;
                  connection.query( 
                    'SELECT mgrid FROM mgrinfo WHERE ?',
                    { Manager: employeeInfo[3].manager }
                    , (err, results) => {
                      if (err) throw err;
                      results.forEach( ({ mgrid }) => {
                        // console.log( `Manager: [${mgrid}]` );
                        employeeInfo[6].manager_id = mgrid;
                      });
                    }
                  );
                }

                if ( bDebugging ) {
                  let aFieldData = [];
                  let sDatarec = "addNewEmployee(): [";
                  aFieldData = retrieveEmployeeInfo( employeeInfo );
                  if ( aFieldData.length === 7 ) {
                    for( var i=0; i < aFieldData.length; i++ ) {
                      var sFieldData = aFieldData[i];
                      sDatarec += (sFieldData + ((i < aFieldData.length-1) ? "," : "" ) );
                    }
                    sDatarec += "]";
                    console.log( sDatarec );
                  }
                }

                inquirer
                .prompt({
                  name: 'action',
                  type: 'list',
                  message: 'Are you sure you wish to ADD this employeee?',
                  choices: [ 'Yes','No'],
                })
                .then( (answer) => {
                  if ( answer.action === 'Yes' ) {
                    if ( addEmployeeRecord( employeeInfo ) ) {
                      if ( bDebugging )
                        console.log( "Employee was added!" );
                    } else {
                      // console.log( "The employee could not be added!  Try again..." );
                    }
                  }
                  displayMainMenu();
                });
  
              }); // endThen( sMgrName choice )

          }); // endConnection.query( Manager )

        } // endIfElse( iEmployee2Update > 0 && iManagerID === 0 )
        }
        //displayMainMenu();

      }); // endThen( Roles )

    }); // endConnection.query( Roles )

  }); // endThen( lastName )
  // }); // endThen( firstName )

};

const displayMainMenu = () =>
{
  if ( bEmployeeExists ) {
    if ( bDebugging )
      console.log( `bEmployeeExists: [${bEmployeeExists}]` );
    bEmployeeExists = false;
  }
  
  createMgrInfo();
  
  inquirer
    .prompt({
      name: 'action',
      type: 'rawlist',
      message: 'What would you like to do?',
      choices: [
        'View all employees',
        'View all employees by Department',
        'View all employees by Role',
        'View all employees by Manager',
        // new inquirer.Separator(),
        'Add Employee',
        'Remove Employee',
        // new inquirer.Separator(),
        'Update employee Role',
        'Update employee Manager',
        // new inquirer.Separator(),
        'Exit'
      ],
    })
    .then( (answer) =>
    {
      switch( answer.action )
      {
        case 'View all employees':
          // First and foremost, create a mgrList:
          // createMgrInfo();
          displayAllEmployees();
          break;
        case 'View all employees by Department':
          displayAllEmployees('Department');
          break;
        case 'View all employees by Role':
          displayAllEmployees('Title');
          break;
        case 'View all employees by Manager':
          displayAllEmployees('Manager');
          // managerSearch();
          break;
        
        case 'Add Employee':
          addNewEmployee(0,0);
          break;
        case 'Remove Employee':
          removeEmployee();
          break;
        
        case 'Update employee Role':
          updateEmployeeRole();
          break;
        case 'Update employee Manager':
          updateEmployeeManager();
          // console.log( `Selected Manager: ${sMgrSelected}` );
          break;
        
        case 'Exit':
          connection.end();
          return;
          // break;

        default:
          console.log( `Invalid action: ${answer.action}` );
          break;
      }
    });
};
