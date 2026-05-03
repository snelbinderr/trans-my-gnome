import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

function handler(m) {
  return (e)=>{
    const msg = `[trans-my-gnome@emmeken.net] ${m}`
    console.log(msg,e)
    throw [new Error(msg), e]
  }
}

export default class TransMyGnome extends Extension {
  gtk4ConfigDirectory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0']));
  userGtkStylesheetFile = this.gtk4ConfigDirectory.get_child('gtk.css');
  transMyGnomeStylesheetFile = this.dir.get_child('stylesheets').get_child('trans-my-gnome.css');

  async enable() {
    try {
      await this.setupGtkFolder().catch(handler("Could not set up GTK config forlder correctly."))

      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch(handler("Could not get gtk.css contents."))
      const newUserGtkStylesheet = this.addTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet)
    }
    catch (e) {
      console.error(e)
    }
  }

  async disable() {
    try {
      const oldUserGtkStylesheet = await this.readFileContents(this.userGtkStylesheetFile).catch("Could not get gtk.css contens.")
      const newUserGtkStylesheet = this.removeTransMyGnomeImport(oldUserGtkStylesheet)
      await this.replaceFileContents(this.userGtkStylesheetFile,newUserGtkStylesheet)
    }
    catch (e) {
      console.error(e)
    }
  }

  async readFileContents(file) {
    let string = ''
    if (file.query_exists(null)) {
      const [contents] = await file.load_contents_async(null).catch(handler(`Could not open file for reading ${file.get_path()}`))
      string = new TextDecoder().decode(contents);
    }
    return string
  }

  async replaceFileContents(file,contents) {
    try {
      await file.replace_contents_bytes_async(new GLib.Bytes(contents), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null)

    } catch (e) {
      handler(`Failed to replace contents of file '${file.get_path()}'.`)(e)
    }
  }

  async setupGtkFolder() {
    if (!this.gtk4ConfigDirectory.query_exists(null)) {
        this.gtk4ConfigDirectory.make_directory_with_parents(null);
    }
  }

  addTransMyGnomeImport(contents) {
    const removedImport = this.removeTransMyGnomeImport(contents)
    const importString = `@import '${this.transMyGnomeStylesheetFile.get_path()}';`;
    const addedImport = removedImport + importString
    return addedImport
  }

  removeTransMyGnomeImport(contents) {
    const regex = /@import.*?trans-my-gnome@emmeken\.net.*?;/m
    const removedImport = contents.replace(regex,'')
    return removedImport
  }

}
