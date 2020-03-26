import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { AlertController } from '@ionic/angular';
import * as firebase from 'firebase/app';
import { UniqueDeviceID } from '@ionic-native/unique-device-id/ngx';
import { User } from "../../models/user.interface";
import 'firebase/storage';

@Component({
  selector: 'app-user-component',
  templateUrl: './user-component.page.html',
  styleUrls: ['./user-component.page.scss'],
})
export class UserComponentPage implements OnInit {

  constructor(private route: ActivatedRoute, private navCtrl: NavController, private fireStore: FirebaseService, private alert: AlertController, private uniqueDeviceID: UniqueDeviceID) { }

  user: any = {
    id: "new-user",
    name: "",
    uid: ""
  };
  user_photos: Array<any> = [];
  triedModify = false
  uid_verif = false

  ngOnInit() {
    this.route.params.subscribe(params => {
      console.log(params)
      if (params.id !== "new-user") {
        this.getUserDataAndWatch(params.id).subscribe(data => {
          this.user = data;
          if (this.user.photos.length > 0)
            this.getUserPhotos()
          else
            this.user_photos.push('./assets/user.png')
        });
      }
    })
  }

  getUserDataAndWatch(id) {
    return this.fireStore.getUserById(id).valueChanges()
  }

  async getUserPhotos() {
    this.user_photos = []
    for (let photo of this.user.photos) {
      let storageRef = firebase
        .storage()
        .ref(photo);

      this.user_photos.push(await storageRef.getDownloadURL());
    }
  }

  async addPhotos() {
    const alert = await this.alert.create({
      header: 'Add photos to ' + this.user.name,
      message: 'Look straight at the camera from a 30cm distance.\nVerify that you\'re in a room with good light, then press <strong>Ok</strong>',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: "OK",
          handler: () => {
            this.user.request_photos = true
            this.saveUpdates()
          }
        }
      ]
    });
    await alert.present();
  }

  trySaveUpdates() {
    if (this.triedModify)
      this.saveUpdates()
  }

  saveUpdates() {
    if (this.user.id)
      this.fireStore.updateUser(this.user)
  }

  finishCreateUser() {
    this.fireStore.createUser(this.user.name, this.user.uid).then((id) => {
      this.getUserDataAndWatch(id).subscribe(data => {
        this.user = data;
      })
    }
    );
  }

  createNewUser() {
    if (this.user.name) {
      if (this.uid_verif) {
        this.uniqueDeviceID.get()
          .then((uuid: any) => {
            this.user.uid = uuid;
            this.finishCreateUser()
          })
          .catch((error: any) => {
            console.log(error)
            this.finishCreateUser()
          });
      } else {
        this.finishCreateUser()
      }
    }
  }

  removePhoto(photo, index) {
    this.fireStore.deleteImage(this.user.photos[index]);
    this.user_photos.splice(index, 1)
    this.user.photos.splice(index, 1)
    this.saveUpdates()
  }

  confirmDeleteAllPhotos() {
    this.fireStore.deleteAllImagesFromUser(this.user.photos)
    this.user_photos = []
    this.user.photos = [];
    this.saveUpdates();
  }

  async removeAllPhotos() {
    const alert = await this.alert.create({
      header: 'Delete all your photos',
      message: 'Are you sure you want to <strong>delete all your photos ?</strong>',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        }, {
          text: 'Delete all',
          handler: () => {
            this.confirmDeleteAllPhotos();
          }
        }
      ]
    });
    await alert.present();
  }

}
